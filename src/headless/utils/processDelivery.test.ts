import { describe, expect, it } from 'vitest'
import type { ProcessRunPublication } from 'thefactory-tools/types'

import {
  isGroupPublishPark,
  isProcessPublishGate,
  mergeProcessPublishEdits,
  processDeliveryPath,
  processDeliveryRepoOf,
  processGroupReadsDelivery,
  processMergeActive,
  processMergeRows,
  processPublicationView,
  processPublishBody,
  processPublishEdits,
  processPublishEditsChanged,
  processPublishView,
} from './processDelivery'
import {
  PROCESS_MERGE_PHASE_VIEW,
  PROCESS_PUBLICATION_BADGES,
  PROCESS_PUBLISH_COPY,
} from './processDeliveryConstants'
import type { ProcessDeliveryData, ProcessDeliveryRepo } from './processDeliveryTypes'

const repo = (over: Partial<ProcessDeliveryRepo> = {}): ProcessDeliveryRepo => ({
  runId: '9e36e753-36eb-4fcc-81b6-381974fae2b2',
  projectId: 'web',
  name: 'Web',
  ticket: 'ABC-12',
  branchTemplate: 'feature/{ticket}-{short}',
  short: 'dark-mode',
  prTitle: 'Add dark mode',
  baseBranch: 'main',
  account: 'builder (GitHub)',
  changed: true,
  ...over,
})
const data = (...repos: ProcessDeliveryRepo[]): ProcessDeliveryData => ({ repos })
const PUBLICATION: ProcessRunPublication = {
  remoteBranch: 'feature/abc-12-dark-mode',
  localBranch: 'feature/abc-12-dark-mode',
  sha: 'a'.repeat(40),
  onto: 'b'.repeat(40),
  pullRequest: { url: 'https://github.com/acme/web/pull/7', number: 7, provider: 'github' },
  status: 'open',
  at: 1,
}

const gateRun = (stepOver: Record<string, unknown> = {}, parkOver: Record<string, unknown> = {}) =>
  ({
    park: { reason: 'gate', stepId: 'publish', message: 'Publish?', parkedAt: 1, ...parkOver },
    plan: { steps: [{ id: 'publish', kind: 'gate', gateKind: 'publish', ...stepOver }] },
  }) as never

describe('isProcessPublishGate', () => {
  it('finds a run waiting at its publish gate', () => {
    expect(isProcessPublishGate(gateRun())).toBe(true)
    expect(
      isProcessPublishGate(gateRun({ id: 'ship', gateKind: 'publish' }, { stepId: 'ship' })),
    ).toBe(true)
    expect(isProcessPublishGate(gateRun({ gateKind: undefined }))).toBe(true)
  })

  it('leaves every other stop', () => {
    expect(
      isProcessPublishGate(gateRun({ id: 'design', gateKind: 'design' }, { stepId: 'design' })),
    ).toBe(false)
    expect(isProcessPublishGate(gateRun({}, { reason: 'step-failed' }))).toBe(false)
    expect(isProcessPublishGate(gateRun({}, { childRunId: 'child' }))).toBe(false)
    expect(isProcessPublishGate(gateRun({ kind: 'agent' }))).toBe(false)
    expect(isProcessPublishGate(gateRun({}, { stepId: 'gone' }))).toBe(false)
    expect(isProcessPublishGate({ plan: { steps: [] } } as never)).toBe(false)
  })
})

describe('isGroupPublishPark', () => {
  it('finds a group run waiting to publish', () => {
    expect(isGroupPublishPark({ status: 'parked', park: { reason: 'publish' } } as never)).toBe(
      true,
    )
    expect(isGroupPublishPark({ status: 'parked', park: { reason: 'sign-off' } } as never)).toBe(
      false,
    )
    expect(isGroupPublishPark({ status: 'running', park: { reason: 'publish' } } as never)).toBe(
      false,
    )
    expect(isGroupPublishPark({ status: 'parked' } as never)).toBe(false)
  })
})

describe('processGroupReadsDelivery', () => {
  const group = (status: string, legs: string[]) =>
    ({ status, legs: legs.map((s) => ({ status: s })), park: { reason: 'publish' } }) as never
  it('reads while it waits to publish or a leg is past its outputs', () => {
    expect(processGroupReadsDelivery(group('parked', ['running']))).toBe(true)
    expect(processGroupReadsDelivery(group('running', ['running', 'integrating']))).toBe(true)
    expect(processGroupReadsDelivery(group('running', ['at-sign-off']))).toBe(true)
  })

  it('reads nothing while every leg still works', () => {
    expect(processGroupReadsDelivery(group('running', ['running', 'blocked']))).toBe(false)
  })
})

describe('processDeliveryPath', () => {
  it('encodes the id', () => {
    expect(processDeliveryPath({ kind: 'run', runId: 'a b' })).toBe('/process-runs/a%20b')
    expect(processDeliveryPath({ kind: 'group', groupRunId: 'g/1' })).toBe(
      '/process-group-runs/g%2F1',
    )
  })
})

describe('the publish card’s edits', () => {
  it('start on the host’s fields', () => {
    expect(processPublishEdits(data(repo()))).toEqual({
      web: { short: 'dark-mode', prTitle: 'Add dark mode' },
    })
  })

  it('keep what the person changed over a new read, field by field', () => {
    const before = data(repo())
    const after = data(repo({ short: 'theme', prTitle: 'Theme' }), repo({ projectId: 'api' }))
    expect(
      mergeProcessPublishEdits(
        before,
        { web: { short: 'night', prTitle: 'Add dark mode' } },
        after,
      ),
    ).toEqual({
      web: { short: 'night', prTitle: 'Theme' },
      api: { short: 'dark-mode', prTitle: 'Add dark mode' },
    })
    expect(mergeProcessPublishEdits(undefined, {}, after).web).toEqual({
      short: 'theme',
      prTitle: 'Theme',
    })
  })

  it('know when the person changed something, spacing aside', () => {
    const d = data(repo())
    expect(processPublishEditsChanged(d, {})).toBe(false)
    expect(
      processPublishEditsChanged(d, { web: { short: ' dark-mode ', prTitle: 'Add dark mode' } }),
    ).toBe(false)
    expect(
      processPublishEditsChanged(d, { web: { short: 'night', prTitle: 'Add dark mode' } }),
    ).toBe(true)
  })

  it('send each repo with changes, trimmed', () => {
    const d = data(repo(), repo({ projectId: 'docs', changed: false }))
    expect(processPublishBody(d, { web: { short: ' night ', prTitle: ' Night ' } })).toEqual({
      repos: [{ projectId: 'web', short: 'night', prTitle: 'Night' }],
    })
  })
})

describe('processPublishView', () => {
  it('shows each repo with the branch its short name makes, ready to publish', () => {
    const view = processPublishView(data(repo()), {}, { publishing: false })
    expect(view).toMatchObject({
      title: PROCESS_PUBLISH_COPY.title,
      line: PROCESS_PUBLISH_COPY.line(1),
      account: 'builder (GitHub)',
      noAccount: false,
      publishing: false,
      canPublish: true,
    })
    expect(view.rows).toEqual([
      {
        projectId: 'web',
        name: 'Web',
        baseBranch: 'main',
        short: 'dark-mode',
        prTitle: 'Add dark mode',
        branch: 'feature/abc-12-dark-mode',
        account: 'builder (GitHub)',
        changed: true,
      },
    ])
  })

  it('follows the short name as it is typed', () => {
    const view = processPublishView(
      data(repo()),
      { web: { short: 'Night Theme toggle', prTitle: 'x' } },
      { publishing: false },
    )
    expect(view.rows[0]!.branch).toBe('feature/abc-12-night-theme-toggle')
  })

  it('cannot publish a short name that makes no branch, or an empty title', () => {
    const noShort = processPublishView(
      data(repo()),
      { web: { short: '!!', prTitle: 'x' } },
      { publishing: false },
    )
    expect(noShort.rows[0]!.branchError).toBeDefined()
    expect(noShort.canPublish).toBe(false)
    const noTitle = processPublishView(
      data(repo()),
      { web: { short: 'x', prTitle: '  ' } },
      { publishing: false },
    )
    expect(noTitle.rows[0]!.titleError).toBe(PROCESS_PUBLISH_COPY.noTitle)
    expect(noTitle.canPublish).toBe(false)
  })

  it('counts only repos with changes, and needs one', () => {
    const view = processPublishView(
      data(repo(), repo({ projectId: 'docs', changed: false, prTitle: '' })),
      {},
      { publishing: false },
    )
    expect(view.line).toBe(PROCESS_PUBLISH_COPY.line(1))
    expect(view.rows[1]!.titleError).toBeUndefined()
    expect(view.canPublish).toBe(true)
    expect(
      processPublishView(data(repo({ changed: false })), {}, { publishing: false }).canPublish,
    ).toBe(false)
  })

  it('names one account only when every repo shares it', () => {
    const two = processPublishView(
      data(repo(), repo({ projectId: 'api', account: 'other' })),
      {},
      { publishing: false },
    )
    expect(two.account).toBeUndefined()
    expect(two.line).toBe(PROCESS_PUBLISH_COPY.line(2))
  })

  it('cannot publish a repo with no account to push as', () => {
    const view = processPublishView(data(repo({ account: undefined })), {}, { publishing: false })
    expect(view).toMatchObject({ noAccount: true, canPublish: false })
  })

  it('cannot be pressed again while it publishes, and says why it failed', () => {
    expect(processPublishView(data(repo()), {}, { publishing: true }).canPublish).toBe(false)
    expect(processPublishView(data(repo()), {}, { publishing: false, error: 'No.' }).error).toBe(
      'No.',
    )
    expect(
      processPublishView(data(repo()), {}, { publishing: false, error: null }),
    ).not.toHaveProperty('error')
  })

  it('names a branch without a ticket by the run', () => {
    const view = processPublishView(data(repo({ ticket: undefined })), {}, { publishing: false })
    expect(view.rows[0]!.branch).toBe('feature/9e36e753-dark-mode')
  })
})

describe('processPublicationView', () => {
  it('shows an open pull request as in review, with its link', () => {
    expect(processPublicationView(PUBLICATION)).toEqual({
      inReview: true,
      badge: PROCESS_PUBLICATION_BADGES.open,
      link: { label: 'PR #7', url: 'https://github.com/acme/web/pull/7' },
      branch: 'feature/abc-12-dark-mode',
    })
  })

  it('shows a merged or closed one as such', () => {
    expect(processPublicationView({ ...PUBLICATION, status: 'merged' })).toMatchObject({
      inReview: false,
      badge: PROCESS_PUBLICATION_BADGES.merged,
    })
    expect(processPublicationView({ ...PUBLICATION, status: 'closed' })!.badge).toEqual(
      PROCESS_PUBLICATION_BADGES.closed,
    )
  })

  it('offers no link without a pull request or with one that is not a web address', () => {
    const { pullRequest: _pr, ...bare } = PUBLICATION
    expect(processPublicationView(bare)).not.toHaveProperty('link')
    expect(
      processPublicationView({
        ...PUBLICATION,
        pullRequest: { url: 'javascript:alert(1)', number: 1, provider: 'github' },
      }),
    ).not.toHaveProperty('link')
  })

  it('shows nothing for work not published', () => {
    expect(processPublicationView(undefined)).toBeUndefined()
  })
})

describe('processDeliveryRepoOf', () => {
  const d = data(repo({ legId: 'web-leg' }), repo({ projectId: 'api' }))
  it('finds a repo by its leg, else its project', () => {
    expect(processDeliveryRepoOf(d, { legId: 'web-leg', projectId: 'x' })!.projectId).toBe('web')
    expect(processDeliveryRepoOf(d, { projectId: 'api' })!.projectId).toBe('api')
    expect(processDeliveryRepoOf(d, { legId: 'gone', projectId: 'web' })).toBeUndefined()
    expect(processDeliveryRepoOf(undefined, { projectId: 'web' })).toBeUndefined()
  })
})

describe('the merge after Accept', () => {
  const merging = (phase: NonNullable<ProcessDeliveryRepo['merge']>['phase'], over = {}) =>
    repo({ publication: PUBLICATION, merge: { phase, at: 1, ...over } })

  it('is on its way while a repo brings in its base, waits for checks or merges', () => {
    expect(processMergeActive(data(merging('bringing-in-base')))).toBe(true)
    expect(processMergeActive(data(merging('waiting-for-checks')))).toBe(true)
    expect(processMergeActive(data(merging('merging')))).toBe(true)
    expect(processMergeActive(data(merging('merged'), merging('conflict')))).toBe(false)
    expect(processMergeActive(data(repo()))).toBe(false)
    expect(processMergeActive(undefined)).toBe(false)
  })

  it('shows each repo merging, with its pull request and checks', () => {
    const rows = processMergeRows(
      data(
        merging('waiting-for-checks', { checksUrl: 'https://github.com/acme/web/pull/7/checks' }),
        repo({ projectId: 'docs' }),
      ),
    )
    expect(rows).toEqual([
      {
        projectId: 'web',
        runId: repo().runId,
        name: 'Web',
        label: PROCESS_MERGE_PHASE_VIEW['waiting-for-checks'].label,
        tone: 'working',
        line: PROCESS_MERGE_PHASE_VIEW['waiting-for-checks'].line,
        active: true,
        link: { label: 'PR #7', url: 'https://github.com/acme/web/pull/7' },
        checksLink: { label: 'Checks', url: 'https://github.com/acme/web/pull/7/checks' },
        canResolve: false,
      },
    ])
  })

  it('offers resolving a conflict on its run', () => {
    const [row] = processMergeRows(data(merging('conflict')))
    expect(row).toMatchObject({
      tone: 'stuck',
      active: false,
      canResolve: true,
      openLabel: 'Resolve it',
    })
  })

  it('names the checks that failed', () => {
    const [row] = processMergeRows(
      data(merging('checks-failed', { failedChecks: ['build', 'lint'] })),
    )
    expect(row).toMatchObject({
      line: 'Failed: build, lint.',
      openLabel: 'Answer it',
      canResolve: false,
    })
    const [plain] = processMergeRows(data(merging('checks-failed', { failedChecks: [] })))
    expect(plain!.line).toBe(PROCESS_MERGE_PHASE_VIEW['checks-failed'].line)
  })

  it('says the host’s own reason over the phase’s line', () => {
    const [row] = processMergeRows(
      data(merging('failed', { error: 'Branch protection refused it.' })),
    )
    expect(row!.line).toBe('Branch protection refused it.')
  })

  it('shows merged and already merged as done, with no line where there is none', () => {
    const [merged, already] = processMergeRows(
      data(
        merging('merged'),
        repo({ projectId: 'api', legId: 'api', merge: { phase: 'already-merged', at: 1 } }),
      ),
    )
    expect(merged).toMatchObject({ tone: 'done', active: false })
    expect(merged).not.toHaveProperty('line')
    expect(merged).not.toHaveProperty('openLabel')
    expect(already).toMatchObject({ legId: 'api', label: 'Already merged', tone: 'done' })
    expect(already).not.toHaveProperty('link')
  })

  it('offers no unsafe links', () => {
    const [row] = processMergeRows(
      data(merging('waiting-for-checks', { checksUrl: 'file:///etc' })),
    )
    expect(row).not.toHaveProperty('checksLink')
  })
})
