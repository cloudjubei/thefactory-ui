import { describe, expect, it } from 'vitest'
import type { ProcessLedgerEntry, ProcessRun } from 'thefactory-tools/types'

import {
  isIntegratingApproval,
  processIntegrationBadge,
  processIntegrationChoices,
  processIntegrationView,
} from './processIntegration'
import { PROCESS_INTEGRATION_NEVER_TRIED } from './processIntegrationConstants'

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

  it('shows the push while a pull request is opened', () => {
    expect(
      processIntegrationView(
        run({ integration: { mode: 'pull-request', status: 'integrating', at: 1 } }),
      )?.title,
    ).toBe('Pushing factory/fonts-1a2b3c4d and opening a pull request…')
  })

  it('shows a merge that landed with its short sha', () => {
    expect(
      processIntegrationView(
        run({ integration: { mode: 'merge', status: 'integrated', sha: SHA, at: 1 } }),
      ),
    ).toEqual({
      tone: 'done',
      title: 'Merged into main',
      sha: 'c0ffee1',
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
      sha: 'c0ffee1',
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
