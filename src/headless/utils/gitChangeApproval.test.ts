import { describe, expect, it } from 'vitest'
import type { ProcessRun } from 'thefactory-tools/types'
import {
  gitChangeArgs,
  gitChangeCard,
  gitChangeDecisionMetadata,
  gitChangeEditValues,
  gitChangeMilestone,
  gitChangeProblem,
  isGitChangeGrant,
} from './gitChangeApproval'
import { GIT_CHANGE_COPY, GIT_CHANGE_DONE, GIT_CHANGE_RUN_BUSY } from './gitChangeApprovalConstants'
import { toolRowMilestone } from './gitSetupApproval'

const card = {
  operation: 'commit',
  headline: 'Commit 1 file to work',
  projectId: 'p1',
  repoPath: '/Users/me/repo',
  branch: 'work',
  warning: 'This changes your real repository at /Users/me/repo',
  message: 'Restore constants',
  edits: [
    {
      arg: 'message',
      label: 'Commit message',
      value: 'Restore constants',
      multiline: true,
      required: true,
    },
  ],
  facts: ['On top of abc.'],
  run: { id: 'run-1', title: 'Read PDFs' },
}

const grant = (over: Record<string, unknown> = {}) => ({
  toolName: 'commitGitChanges',
  args: { paths: ['a.ts'], message: 'Restore constants' },
  detail: { tool: 'commitGitChanges', args: {}, detail: card },
  ...over,
})

const runAs = (status: ProcessRun['status'], park?: ProcessRun['park']) =>
  ({ status, ...(park ? { park } : {}) }) as Pick<ProcessRun, 'status' | 'park'>

describe('isGitChangeGrant', () => {
  it('knows a git change by the grant’s tool', () => {
    expect(isGitChangeGrant({ toolName: 'mergeGitBranch' })).toBe(true)
  })

  it('knows a conflict resolution as one, and the read of the conflicts as none', () => {
    expect(isGitChangeGrant({ toolName: 'resolveGitMergeConflicts' })).toBe(true)
    expect(isGitChangeGrant({ toolName: 'readGitMergeConflicts' })).toBe(false)
  })

  it('knows one by its payload’s tool', () => {
    expect(isGitChangeGrant({ detail: { tool: 'pushGitBranch' } })).toBe(true)
  })

  it('knows any other tool is not one', () => {
    expect(isGitChangeGrant({ toolName: 'setupProjectGitRepo' })).toBe(false)
    expect(isGitChangeGrant({})).toBe(false)
  })
})

describe('gitChangeArgs', () => {
  it('reads the grant’s arguments, else the payload’s', () => {
    expect(gitChangeArgs({ args: { a: 1 } })).toEqual({ a: 1 })
    expect(gitChangeArgs({ detail: { args: { b: 2 } } })).toEqual({ b: 2 })
  })
})

describe('gitChangeCard', () => {
  it('reads the card the host read for the ask', () => {
    expect(gitChangeCard(grant())).toEqual(card)
  })

  it('reads none from an ask without one', () => {
    expect(gitChangeCard(grant({ detail: { tool: 'commitGitChanges', args: {} } }))).toBeUndefined()
  })

  it('reads none without the warning it must show', () => {
    const { warning: _w, ...rest } = card
    expect(gitChangeCard(grant({ detail: { detail: rest } }))).toBeUndefined()
  })

  it('reads a card without facts as having none', () => {
    const { facts: _f, ...rest } = card
    expect(gitChangeCard(grant({ detail: { detail: rest } }))?.facts).toEqual([])
  })
})

const prCard = {
  ...card,
  operation: 'pull-request',
  edits: [
    { arg: 'title', label: 'Pull request title', value: 'Add w', required: true },
    { arg: 'body', label: 'Pull request description', value: '', multiline: true },
  ],
  run: undefined,
}

describe('the card’s edits', () => {
  it('start as the host read the card with them', () => {
    expect(gitChangeEditValues(card)).toEqual({ message: 'Restore constants' })
    expect(gitChangeEditValues(prCard)).toEqual({ title: 'Add w', body: '' })
  })

  it('are none on a card that offers none', () => {
    expect(gitChangeEditValues({ ...card, edits: undefined })).toEqual({})
  })

  it('are sent only when the person changed them', () => {
    expect(gitChangeDecisionMetadata(card, { message: ' Restore constants ' })).toBeUndefined()
    expect(
      gitChangeDecisionMetadata(card, { message: 'Put back the viewImage constants' }),
    ).toEqual({ args: { message: 'Put back the viewImage constants' } })
  })

  it('send each changed one, and only those', () => {
    expect(gitChangeDecisionMetadata(prCard, { title: 'Add w', body: 'Why' })).toEqual({
      args: { body: 'Why' },
    })
  })

  it('send a switch as true or false, not as its words', () => {
    const merge = {
      ...card,
      operation: 'merge',
      edits: [
        { arg: 'source', label: 'Branch to merge', value: 'feat', kind: 'branch' as const },
        { arg: 'buildFirst', label: 'Build first', value: 'true', kind: 'toggle' as const },
      ],
    }
    expect(gitChangeDecisionMetadata(merge, { source: 'feat', buildFirst: 'false' })).toEqual({
      args: { buildFirst: false },
    })
  })

  it('send a branch picked in place of the one asked about', () => {
    const merge = {
      ...card,
      operation: 'merge',
      edits: [{ arg: 'source', label: 'Branch to merge', value: 'feat', kind: 'branch' as const }],
    }
    expect(gitChangeDecisionMetadata(merge, { source: 'other' })).toEqual({
      args: { source: 'other' },
    })
  })

  it('are never sent from a card that offers none', () => {
    expect(
      gitChangeDecisionMetadata({ ...card, edits: undefined }, { message: 'x' }),
    ).toBeUndefined()
  })
})

describe('gitChangeProblem', () => {
  const start = { message: 'm' }
  it('blocks approving while the run works on the branch', () => {
    expect(gitChangeProblem(card, start, runAs('running'))).toBe(
      GIT_CHANGE_RUN_BUSY('Read PDFs', 'work'),
    )
  })

  it('blocks it while the run’s agent waits on the person mid-step', () => {
    expect(
      gitChangeProblem(
        card,
        start,
        runAs('parked', { reason: 'step-waiting', message: 'm', parkedAt: 1, stepInFlight: true }),
      ),
    ).toBe(GIT_CHANGE_RUN_BUSY('Read PDFs', 'work'))
  })

  it('lets it through once the run has parked', () => {
    expect(
      gitChangeProblem(card, start, runAs('parked', { reason: 'gate', message: 'm', parkedAt: 1 })),
    ).toBeUndefined()
  })

  it('lets it through for a branch no run works on', () => {
    expect(gitChangeProblem({ ...card, run: undefined }, start, runAs('running'))).toBeUndefined()
  })

  it('blocks a required edit left empty, naming it', () => {
    expect(gitChangeProblem(card, { message: '  ' }, undefined)).toBe(
      GIT_CHANGE_COPY.editEmpty('Commit message'),
    )
    expect(gitChangeProblem(prCard, { title: '', body: '' }, undefined)).toBe(
      GIT_CHANGE_COPY.editEmpty('Pull request title'),
    )
  })

  it('lets an optional edit stay empty', () => {
    expect(gitChangeProblem(prCard, { title: 'Add w', body: '' }, undefined)).toBeUndefined()
  })
})

describe('gitChangeMilestone — a conflict resolution', () => {
  const resolved = (committed: boolean) =>
    gitChangeMilestone(
      {
        operation: 'resolve-conflicts',
        ok: true,
        repoPath: '/Users/me/repo',
        branch: 'dev',
        sha: '8322d8721234abcd',
        resolved: ['app/style.css'],
        remaining: [],
        committed,
      },
      'success',
      false,
    )

  it('says the merge was committed when it was', () => {
    expect(resolved(true)).toEqual({
      tone: 'success',
      title: `${GIT_CHANGE_COPY.mergeCommitted} 8322d872 on dev`,
      detail: '/Users/me/repo',
    })
  })

  it('says the merge is still open when it was not', () => {
    expect(resolved(false)?.title).toBe(`${GIT_CHANGE_DONE['resolve-conflicts']} 8322d872 on dev`)
  })
})

describe('gitChangeMilestone', () => {
  it('waits on the person while the ask is open', () => {
    expect(gitChangeMilestone(undefined, 'running', true)).toEqual({
      tone: 'waiting',
      title: GIT_CHANGE_COPY.waiting,
    })
  })

  it('shows the commit read back from the repository', () => {
    expect(
      gitChangeMilestone(
        JSON.stringify({
          operation: 'commit',
          ok: true,
          repoPath: '/Users/me/repo',
          branch: 'work',
          sha: '8322d8721234abcd',
        }),
        'success',
        false,
      ),
    ).toEqual({ tone: 'success', title: 'Committed 8322d872 on work', detail: '/Users/me/repo' })
  })

  it('shows why nothing changed', () => {
    expect(gitChangeMilestone({ error: 'The repository changed.' }, 'success', false)).toEqual({
      tone: 'error',
      title: GIT_CHANGE_COPY.failed,
      detail: 'The repository changed.',
    })
  })

  it('shows a failed change that carries its own reason', () => {
    expect(
      gitChangeMilestone({ operation: 'push', ok: false, error: 'rejected' }, 'success', false),
    ).toEqual({ tone: 'error', title: GIT_CHANGE_COPY.failed, detail: 'rejected' })
  })

  it('links the pull request it opened', () => {
    expect(
      gitChangeMilestone(
        {
          operation: 'pull-request',
          ok: true,
          branch: 'work',
          sha: 'abcdef0123',
          pullRequestUrl: 'https://github.com/acme/repo/pull/7',
        },
        'success',
        false,
      ),
    ).toEqual({
      tone: 'success',
      title: 'Pushed for a pull request — abcdef01 on work',
      link: { url: 'https://github.com/acme/repo/pull/7', label: GIT_CHANGE_COPY.pullRequest },
    })
  })

  it('links the page to open one from when the host has no API for it', () => {
    expect(
      gitChangeMilestone(
        {
          operation: 'pull-request',
          ok: true,
          branch: 'work',
          compareUrl: 'https://git.example/c',
        },
        'success',
        false,
      )?.link,
    ).toEqual({ url: 'https://git.example/c', label: GIT_CHANGE_COPY.pullRequestPage })
  })

  it('shows nothing for a row that did not succeed', () => {
    expect(gitChangeMilestone({ ok: true }, 'errored', false)).toBeUndefined()
  })

  it('is the milestone every git change tool row shows', () => {
    expect(
      toolRowMilestone(
        'moveGitBranch',
        { operation: 'move-branch', ok: true, sha: 'abcdef0123', branch: 'b' },
        'success',
        false,
      ),
    ).toEqual({
      tone: 'success',
      title: 'Branch moved to abcdef01 on b',
    })
  })
})
