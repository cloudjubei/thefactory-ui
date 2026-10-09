import { describe, expect, it } from 'vitest'
import type { ProcessLedgerEntry, ProcessRun } from 'thefactory-tools/types'

import {
  isIntegratingApproval,
  processIntegrationBadge,
  processIntegrationChoices,
  processIntegrationView,
  processRunIntegrationModes,
  soleIntegrationMode,
} from './processIntegration'
import { PROCESS_INTEGRATION_NEVER_TRIED } from './processIntegrationConstants'
import { PROCESS_INTEGRATION_CHECK_MERGE } from './processIntegrationFormConstants'

const GIT_WORDS = /merge|branch|commit|pull request|\bPR\b|push|squash|git/i

const workBranch = { name: 'factory/fonts-1a2b3c4d', baseRef: 'main', baseSha: 'a'.repeat(40) }
const SHA = 'c0ffee1234567890c0ffee1234567890c0ffee12'

const approved: ProcessLedgerEntry = {
  id: 'g',
  stepId: 'sign-off',
  iteration: 1,
  status: 'done',
  outcome: 'passed',
  startedAt: 0,
  override: { choice: 'approve', at: 1, integration: 'merge' },
}

const run = (over: Partial<ProcessRun> = {}): ProcessRun => ({
  id: 'r',
  projectId: 'p',
  storyId: 's',
  title: 'Fonts',
  status: 'succeeded',
  loopCounts: {},
  ledger: [approved],
  startedAt: 0,
  updatedAt: 0,
  workBranch,
  plan: {
    definitionId: 'story',
    definitionScope: 'global',
    definitionVersion: 1,
    name: 'Story',
    steps: [
      { id: 'features:f1', name: 'Fonts', kind: 'process' },
      { id: 'sign-off', name: 'Sign-off', kind: 'gate' },
    ],
    loops: [],
    frozenAt: 0,
  },
  ...over,
})

describe('processIntegrationChoices', () => {
  it('offers merge, merge as one commit and a pull request, in that order', () => {
    expect(processIntegrationChoices(workBranch).map((c) => [c.mode, c.label])).toEqual([
      ['merge', 'Merge'],
      ['squash', 'Merge as one commit'],
      ['pull-request', 'Open a pull request'],
    ])
  })

  it('says what each does, naming the branches it touches', () => {
    expect(processIntegrationChoices(workBranch).map((c) => c.detail)).toEqual([
      'Adds each agent’s commit to main as it is.',
      'Squashes the work into a single commit on main.',
      'Pushes factory/fonts-1a2b3c4d and opens a PR for review on GitHub / Azure DevOps; nothing lands on main until it is merged there.',
    ])
  })
})

describe('the ways a group leg may be brought in', () => {
  const leg = (id: string, dependsOn: string[] = []) => ({ id, dependsOn }) as never
  const group = { legs: [leg('tools'), leg('backend', ['tools'])] }

  it('narrows a leg other legs build on to merge or squash', () => {
    expect(processRunIntegrationModes({ groupLegId: 'tools' }, group)).toEqual(['merge', 'squash'])
  })

  it('leaves every way open for a leg nothing builds on', () => {
    expect(processRunIntegrationModes({ groupLegId: 'backend' }, group)).toEqual([
      'merge',
      'squash',
      'pull-request',
    ])
  })

  it('does not narrow a run that is not a group leg, or whose group is not loaded', () => {
    expect(processRunIntegrationModes({}, group)).toBeUndefined()
    expect(processRunIntegrationModes({ groupLegId: 'tools' }, undefined)).toBeUndefined()
  })

  it('offers only the narrowed ways, and none of the others', () => {
    expect(processIntegrationChoices(workBranch, ['merge', 'squash']).map((c) => c.mode)).toEqual([
      'merge',
      'squash',
    ])
  })

  it('needs no choice when one way is left', () => {
    expect(soleIntegrationMode(workBranch, ['squash'])).toBe('squash')
    expect(soleIntegrationMode(workBranch, ['merge', 'squash'])).toBeUndefined()
  })
})

describe('a project with no git of its own', () => {
  const shadowBranch = { ...workBranch, shadow: true }
  const shadowRun = (over: Partial<ProcessRun> = {}) => run({ workBranch: shadowBranch, ...over })

  it('offers one way in — plain approval — in words without git in them', () => {
    const choices = processIntegrationChoices(shadowBranch)
    expect(choices.map((c) => [c.mode, c.label])).toEqual([['merge', 'Approve']])
    expect(choices[0]!.detail).toMatch(/project folder/)
    expect(choices[0]!.detail).not.toMatch(GIT_WORDS)
  })

  it('has approval bring the work in at once, with no question of how', () => {
    expect(soleIntegrationMode(shadowBranch)).toBe('merge')
    expect(soleIntegrationMode(workBranch)).toBeUndefined()
  })

  it('tells how bringing the work in went without git words or a sha', () => {
    const views = [
      processIntegrationView(shadowRun()),
      processIntegrationView(
        shadowRun({ integration: { mode: 'merge', status: 'integrating', at: 1 } }),
      ),
      processIntegrationView(
        shadowRun({ integration: { mode: 'merge', status: 'integrated', sha: SHA, at: 1 } }),
      ),
      processIntegrationView(
        shadowRun({ integration: { mode: 'merge', status: 'failed', error: 'x', at: 1 } }),
      ),
    ]
    for (const view of views) {
      expect(view).toBeDefined()
      expect(view!.title).not.toMatch(GIT_WORDS)
      expect(view!.detail ?? '').not.toMatch(GIT_WORDS)
      expect(view!.sha).toBeUndefined()
    }
    expect(views[2]).toMatchObject({ tone: 'done', title: 'Brought into the project folder' })
    expect(views[3]).toMatchObject({ tone: 'stuck', detail: 'x', canRetry: true })
  })

  it('badges an approved run whose work has not come in without git words', () => {
    const badge = processIntegrationBadge(
      shadowRun({ integration: { mode: 'merge', status: 'failed', at: 1 } }),
    )
    expect(badge?.tone).toBe('on_hold')
    expect(badge?.label).not.toMatch(GIT_WORDS)
  })
})

describe('isIntegratingApproval', () => {
  const parked = (over: Partial<ProcessRun> = {}) =>
    run({
      status: 'parked',
      ledger: [],
      park: { reason: 'gate', stepId: 'sign-off', message: '', parkedAt: 0 },
      ...over,
    })

  it('is an approval at the sign-off of a run with a work branch', () => {
    expect(isIntegratingApproval(parked(), 'approve')).toBe(true)
  })

  it('is not any other choice there', () => {
    expect(isIntegratingApproval(parked(), 'reject')).toBe(false)
  })

  it('is not an approval of a run without a work branch', () => {
    expect(isIntegratingApproval(parked({ workBranch: undefined }), 'approve')).toBe(false)
  })

  it('is not an approval of a run that is not parked on a step', () => {
    expect(isIntegratingApproval(parked({ park: undefined }), 'approve')).toBe(false)
  })
})

describe('processIntegrationView', () => {
  it('is nothing for a run without a work branch', () => {
    expect(processIntegrationView(run({ workBranch: undefined }))).toBeUndefined()
  })

  it('is nothing for a run that was not approved', () => {
    expect(processIntegrationView(run({ status: 'parked', ledger: [] }))).toBeUndefined()
  })

  it('is nothing for a nested run', () => {
    expect(processIntegrationView(run({ parentRunId: 'root' }))).toBeUndefined()
  })

  it('offers a retry for an approved run whose work was never brought in', () => {
    expect(processIntegrationView(run())).toMatchObject({
      tone: 'on_hold',
      detail: PROCESS_INTEGRATION_NEVER_TRIED,
      canRetry: true,
    })
  })

  it('shows the work being merged while it happens, with no retry', () => {
    expect(
      processIntegrationView(run({ integration: { mode: 'merge', status: 'integrating', at: 1 } })),
    ).toEqual({ tone: 'working', title: 'Merging into main…', canRetry: false, busy: true })
  })

  it('says the result is being built and type-checked while a checked merge happens', () => {
    expect(
      processIntegrationView(
        run({
          integration: {
            mode: 'merge',
            status: 'integrating',
            landing: { checkMerge: true },
            at: 1,
          },
        }),
      )?.detail,
    ).toBe(PROCESS_INTEGRATION_CHECK_MERGE.busy('main'))
  })

  it('carries the result’s checks on a landing that failed them', () => {
    const checks = { status: 'failed' as const, summary: 'It fails.', checks: [] }
    expect(
      processIntegrationView(
        run({
          integration: {
            mode: 'merge',
            status: 'failed',
            error: 'main did not move.',
            checks,
            at: 1,
          },
        }),
      ),
    ).toMatchObject({ tone: 'stuck', detail: 'main did not move.', checks, canRetry: true })
  })

  it('carries the result’s checks on a landing that passed them', () => {
    const checks = { status: 'passed' as const, summary: 'It builds.', checks: [] }
    expect(
      processIntegrationView(
        run({ integration: { mode: 'squash', status: 'integrated', sha: SHA, checks, at: 1 } }),
      )?.checks,
    ).toEqual(checks)
  })

  it('shows the push while a pull request is opened', () => {
    expect(
      processIntegrationView(
        run({ integration: { mode: 'pull-request', status: 'integrating', at: 1 } }),
      )?.title,
    ).toBe('Pushing factory/fonts-1a2b3c4d and opening a pull request…')
  })

  it('shows a merge that landed with its full sha', () => {
    expect(
      processIntegrationView(
        run({ integration: { mode: 'merge', status: 'integrated', sha: SHA, at: 1 } }),
      ),
    ).toEqual({
      tone: 'done',
      title: 'Merged into main',
      sha: SHA,
      canRetry: false,
      busy: false,
    })
  })

  it('says a squash landed as one commit', () => {
    expect(
      processIntegrationView(
        run({ integration: { mode: 'squash', status: 'integrated', sha: SHA, at: 1 } }),
      )?.title,
    ).toBe('Merged into main as one commit')
  })

  it('links the opened pull request and says nothing has landed yet', () => {
    expect(
      processIntegrationView(
        run({
          integration: {
            mode: 'pull-request',
            status: 'integrated',
            sha: SHA,
            branch: workBranch.name,
            pullRequestUrl: 'https://github.com/acme/site/pull/9',
            at: 1,
          },
        }),
      ),
    ).toEqual({
      tone: 'done',
      title: 'Pull request opened',
      detail: 'factory/fonts-1a2b3c4d → main. Nothing lands on main until it is merged there.',
      link: { url: 'https://github.com/acme/site/pull/9', label: 'Open the pull request' },
      sha: SHA,
      canRetry: false,
      busy: false,
    })
  })

  it('links where to open a pull request when the host has no API for one', () => {
    expect(
      processIntegrationView(
        run({
          integration: {
            mode: 'pull-request',
            status: 'integrated',
            branch: workBranch.name,
            compareUrl: 'https://gitlab.com/acme/site/-/merge_requests/new',
            at: 1,
          },
        }),
      ),
    ).toMatchObject({
      title: 'Pushed factory/fonts-1a2b3c4d',
      link: {
        url: 'https://gitlab.com/acme/site/-/merge_requests/new',
        label: 'Open a pull request',
      },
    })
  })

  it('names only the pushed branch when there is nowhere to link', () => {
    const view = processIntegrationView(
      run({
        integration: { mode: 'pull-request', status: 'integrated', branch: 'factory/x', at: 1 },
      }),
    )
    expect(view).toMatchObject({
      title: 'Pushed factory/x',
      detail: 'Open a pull request for it into main on your git host.',
    })
    expect(view?.link).toBeUndefined()
  })

  it('shows a failed merge as approved-but-not-merged, with the reason and a retry', () => {
    expect(
      processIntegrationView(
        run({
          integration: { mode: 'merge', status: 'failed', error: 'Conflicts in a.ts.', at: 1 },
        }),
      ),
    ).toEqual({
      tone: 'stuck',
      title: 'Approved — not merged into main',
      detail: 'Conflicts in a.ts.',
      canRetry: true,
      busy: false,
    })
  })

  it('offers an agent to resolve work that conflicts with its base', () => {
    expect(
      processIntegrationView(
        run({
          integration: {
            mode: 'squash',
            status: 'failed',
            error: 'The work conflicts with main in src/file/fileConstants.ts',
            conflict: {
              baseRef: 'main',
              baseSha: SHA,
              commits: 2,
              paths: ['src/file/fileConstants.ts'],
            },
            at: 1,
          },
        }),
      ),
    ).toEqual({
      tone: 'stuck',
      title: 'Approved — not merged into main',
      detail: 'The work conflicts with main in src/file/fileConstants.ts',
      conflict: { baseRef: 'main', paths: ['src/file/fileConstants.ts'] },
      canRetry: true,
      busy: false,
    })
  })

  it('says a failed pull request was not opened', () => {
    expect(
      processIntegrationView(
        run({ integration: { mode: 'pull-request', status: 'failed', error: 'x', at: 1 } }),
      )?.title,
    ).toBe('Approved — the pull request was not opened')
  })
})

describe('processIntegrationBadge', () => {
  it('says the work is being brought in while it is', () => {
    expect(
      processIntegrationBadge(
        run({ integration: { mode: 'merge', status: 'integrating', at: 1 } }),
      ),
    ).toEqual({ label: 'Bringing the work in', tone: 'working' })
  })

  it('says an approved run is not merged while its work has not landed', () => {
    expect(
      processIntegrationBadge(run({ integration: { mode: 'merge', status: 'failed', at: 1 } })),
    ).toEqual({ label: 'Approved — not merged', tone: 'on_hold' })
  })

  it('has nothing to say once the work has landed', () => {
    expect(
      processIntegrationBadge(run({ integration: { mode: 'merge', status: 'integrated', at: 1 } })),
    ).toBeUndefined()
  })

  it('has nothing to say for a run without a work branch', () => {
    expect(processIntegrationBadge(run({ workBranch: undefined }))).toBeUndefined()
  })
})

describe('processIntegrationView — a conflict on landing sent to an agent', () => {
  const conflict = {
    baseRef: 'main',
    baseSha: SHA,
    commits: 2,
    paths: ['src/file/fileConstants.ts'],
  }
  const resolving = (over: Partial<ProcessRun> = {}): ProcessRun => {
    const base = run()
    return run({
      status: 'running',
      plan: {
        ...base.plan,
        steps: [
          ...base.plan.steps,
          {
            id: 'resolve-conflict',
            name: 'Resolve conflict',
            kind: 'agent',
            agentType: 'developer',
          },
          { id: 'conflict-checks', name: 'Checks', kind: 'check' },
          { id: 'confirm-landing', name: 'Confirm landing', kind: 'gate' },
        ],
        amendments: [
          {
            at: 2,
            stepIds: ['resolve-conflict', 'conflict-checks', 'confirm-landing'],
            integrationConflict: conflict,
          },
        ],
      },
      ...over,
    })
  }

  it('says an agent is resolving it while the run works', () => {
    expect(processIntegrationView(resolving())).toEqual({
      tone: 'working',
      title: 'An agent is resolving the conflict with main',
      detail:
        'It resolves the files, main is merged into the work and the checks run — then the work comes back to you to confirm how it lands.',
      files: ['src/file/fileConstants.ts'],
      canRetry: false,
      busy: true,
    })
  })

  it('shows what changed when the work is back for the person to confirm', () => {
    const checked: ProcessLedgerEntry = {
      id: 'c',
      stepId: 'conflict-checks',
      iteration: 1,
      status: 'done',
      outcome: 'passed',
      summary: 'Build ✓ · Unit tests ✓',
      startedAt: 3,
      baseUpdate: { baseRef: 'main', baseSha: SHA, commits: 2, sha: 'm'.repeat(40), at: 4 },
    }
    const parked = resolving({
      status: 'parked',
      park: { reason: 'gate', stepId: 'confirm-landing', message: 'Confirm', parkedAt: 5 },
      ledger: [approved, checked],
    })
    expect(processIntegrationView(parked)).toEqual({
      tone: 'review',
      title: 'The conflict with main is resolved — confirm how the work lands',
      detail:
        'main was merged into the work, resolving the files below, and the checks ran on it: Build ✓ · Unit tests ✓. Approve to land it — the way, identity and message you chose before are kept.',
      sha: 'm'.repeat(40),
      files: ['src/file/fileConstants.ts'],
      canRetry: false,
      busy: false,
    })
  })

  it('names the commit the checks ran on — the one that lands — past the merge a fix built on', () => {
    const merged: ProcessLedgerEntry = {
      id: 'c1',
      stepId: 'conflict-checks',
      iteration: 1,
      status: 'done',
      outcome: 'failed',
      checkedSha: 'm'.repeat(40),
      startedAt: 3,
      baseUpdate: { baseRef: 'main', baseSha: SHA, commits: 2, sha: 'm'.repeat(40), at: 4 },
    }
    const fixed: ProcessLedgerEntry = {
      id: 'c2',
      stepId: 'conflict-checks',
      iteration: 2,
      status: 'done',
      outcome: 'passed',
      checkedSha: 'f'.repeat(40),
      startedAt: 6,
    }
    const parked = resolving({
      status: 'parked',
      park: { reason: 'gate', stepId: 'confirm-landing', message: 'Confirm', parkedAt: 7 },
      ledger: [approved, merged, fixed],
    })
    expect(processIntegrationView(parked)?.sha).toBe('f'.repeat(40))
  })

  it('leaves a park on the way to the person, who answers it there', () => {
    const stuck = resolving({
      status: 'parked',
      park: { reason: 'step-errored', stepId: 'conflict-checks', message: 'x', parkedAt: 5 },
    })
    expect(processIntegrationView(stuck)).toBeUndefined()
  })

  it('reports the landing as usual once it is confirmed and lands', () => {
    const landed = resolving({
      status: 'succeeded',
      integration: { mode: 'squash', status: 'integrated', sha: SHA, at: 6 },
    })
    expect(processIntegrationView(landed)?.title).toBe('Merged into main as one commit')
  })
})
