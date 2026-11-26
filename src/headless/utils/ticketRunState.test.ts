import { describe, expect, it } from 'vitest'
import type { ProcessGroupRun, ProcessRun } from 'thefactory-tools/types'
import { getChatContextKey } from 'thefactory-tools/utils'
import { reviewChatContext } from './colleagueReviewStart'
import type { ReviewMergeJob } from './colleagueReviewMergeTypes'
import { ticketRunIndex, ticketRunMergeKeys, ticketRunState } from './ticketRunState'

const GROUP = 'g1'
const NOW = 1_000_000

const STEPS = [
  { id: 'review', name: 'Review', kind: 'agent' },
  { id: 'approval', name: 'Your approval', kind: 'gate', gateKind: 'actions' },
  { id: 'await-update', name: 'Wait for the developer', kind: 'action' },
  { id: 'push-approval', name: 'Approve the push', kind: 'gate', gateKind: 'actions' },
  { id: 'merge', name: 'Merge', kind: 'action' },
]

const run = (over: Partial<ProcessRun> = {}): ProcessRun =>
  ({
    id: 'r1',
    projectId: 'osc-be',
    title: 'Review of ZNR-756, round 2',
    status: 'running',
    chatContextId: getChatContextKey(reviewChatContext(GROUP, 'ZNR-756')),
    ticketReview: { groupId: GROUP, ticketKey: 'ZNR-756', round: 2 },
    plan: { steps: STEPS, loops: [] },
    loopCounts: {},
    ledger: [],
    startedAt: 1,
    updatedAt: 10,
    ...over,
  }) as unknown as ProcessRun

const at = (stepId: string) => ({ cursor: { stepId, iteration: 1 } }) as Partial<ProcessRun>

const entry = (stepId: string, outcome?: string) => ({
  id: `e-${stepId}`,
  stepId,
  iteration: 1,
  status: outcome ? 'done' : 'running',
  startedAt: 1,
  ...(outcome ? { outcome, endedAt: 2 } : {}),
})

const parkedAt = (stepId: string, reason = 'gate', extra: object = {}) =>
  ({
    status: 'parked',
    cursor: { stepId, iteration: 1 },
    park: { reason, stepId, message: 'Stopped', parkedAt: 5, ...extra },
  }) as Partial<ProcessRun>

const groupRun = (over: Partial<ProcessGroupRun> = {}): ProcessGroupRun =>
  ({
    id: 'gr1',
    groupId: GROUP,
    groupStoryId: 'gs1',
    title: 'Fix the login',
    status: 'running',
    legs: [
      { id: 'l1', projectId: 'osc-be', status: 'running' },
      { id: 'l2', projectId: 'osc-ui', status: 'waiting' },
    ],
    startedAt: 1,
    updatedAt: 20,
    ...over,
  }) as unknown as ProcessGroupRun

const TICKET = { key: 'ZNR-756', statusCategory: 'indeterminate' }
const WORKED = {
  key: 'ZNR-800',
  statusCategory: 'indeterminate',
  groupStory: { id: 'gs1', parts: [{ projectId: 'osc-ui', storyId: 's-ui' }] },
}

const stateOf = (
  runs: readonly ProcessRun[],
  ticket: Parameters<typeof ticketRunState>[0] = TICKET,
  groupRuns: readonly ProcessGroupRun[] = [],
) => ticketRunState(ticket, ticketRunIndex(GROUP, runs, groupRuns), NOW)

describe('ticketRunIndex', () => {
  it('finds a review run by the ticket it reviews, never by a chat it holds, only in the group', () => {
    const index = ticketRunIndex(
      GROUP,
      [
        run({ id: 'by-subject', ticketReview: { groupId: GROUP, ticketKey: 'znr-756', round: 1 } }),
        run({
          id: 'by-chat',
          ticketReview: undefined,
          chatContextId: getChatContextKey(reviewChatContext(GROUP, 'ZNR-757')),
        }),
        run({
          id: 'other-group',
          ticketReview: { groupId: 'g2', ticketKey: 'ZNR-756', round: 1 },
          chatContextId: getChatContextKey(reviewChatContext('g2', 'ZNR-756')),
        }),
        run({ id: 'no-ticket', ticketReview: undefined, chatContextId: 'PROJECT:osc-be' }),
      ],
      [],
    )
    expect(index.reviews.get('ZNR-756')?.map((r) => r.id)).toEqual(['by-subject'])
    expect(index.reviews.get('ZNR-757')).toBeUndefined()
    expect([...index.reviews.keys()]).toEqual(['ZNR-756'])
    expect(index.stories.size).toBe(0)
  })

  it('keeps a story’s own runs by project and story, leaving out a group run’s legs', () => {
    const index = ticketRunIndex(
      GROUP,
      [
        run({
          id: 'own',
          ticketReview: undefined,
          chatContextId: undefined,
          storyId: 's-ui',
          projectId: 'osc-ui',
        }),
        run({
          id: 'leg',
          ticketReview: undefined,
          storyId: 's-ui',
          projectId: 'osc-ui',
          groupRunId: 'gr1',
        }),
        run({ id: 'unlinked', ticketReview: undefined, chatContextId: undefined }),
      ],
      [
        groupRun(),
        groupRun({ id: 'gr-other', groupId: 'g2' }),
        groupRun({ id: 'gr-free', groupStoryId: undefined }),
      ],
    )
    expect(index.stories.get('osc-ui/s-ui')?.map((r) => r.id)).toEqual(['own'])
    expect(index.stories.size).toBe(1)
    expect(index.groupRuns.get('gs1')?.map((g) => g.id)).toEqual(['gr1'])
    expect(index.groupRuns.size).toBe(1)
  })
})

describe('ticketRunState', () => {
  it('says what the person is waited for at a gate, by its step, and opens the run', () => {
    expect(stateOf([run(parkedAt('push-approval'))])).toEqual({
      kind: 'review',
      name: 'Review run',
      state: 'Waiting for you: Approve the push',
      label: 'Review run · Waiting for you: Approve the push',
      hint: 'Ready for your decision',
      tone: 'review',
      asks: true,
      live: false,
      open: { kind: 'run', projectId: 'osc-be', runId: 'r1' },
    })
  })

  it('says the step a working run is on, live', () => {
    const state = stateOf([
      run({ ...at('merge'), ledger: [entry('merge')] } as Partial<ProcessRun>),
    ])
    expect(state).toMatchObject({
      label: 'Review run · Merge',
      hint: 'Merge',
      tone: 'running',
      asks: false,
      live: true,
    })
  })

  it('says a run not started yet is starting', () => {
    expect(stateOf([run({ status: 'pending' })])).toMatchObject({
      state: 'Starting',
      live: true,
      asks: false,
    })
  })

  it('says what else the person is asked, in the Processes list’s words', () => {
    const state = stateOf([run({ ...parkedAt('merge', 'step-errored') })])
    expect(state).toMatchObject({
      state: 'Decide: Merge did not complete',
      hint: 'Decide: Merge did not complete',
      tone: 'on_hold',
      asks: true,
      live: false,
    })
  })

  it('waits on the developer without asking the person, and asks once their reply came', () => {
    const ask = {
      kind: 'blocker',
      agent: 'host',
      title: 'Waiting for a reply in Saif’s thread',
      detail: 'd',
      outside: { awaits: 'a reply in Saif’s thread' },
    }
    expect(stateOf([run(parkedAt('await-update', 'step-waiting', { ask }))])).toMatchObject({
      state: 'Waiting for a reply in Saif’s thread',
      asks: false,
      live: false,
    })
    const came = {
      ...ask,
      outside: {
        ...ask.outside,
        arrived: { title: 'Saif replied', detail: 'Pushed', carryOnLabel: 'Start round 3' },
      },
    }
    expect(stateOf([run(parkedAt('await-update', 'step-waiting', { ask: came }))])).toMatchObject({
      state: 'Waiting for you: Start round 3',
      asks: true,
    })
  })

  it('says where the newest run failed, not live, and nothing once the ticket is done', () => {
    const failed = run({
      status: 'failed',
      endedAt: 9,
      ledger: [entry('review', 'passed'), entry('merge', 'errored'), entry('report', 'passed')],
    } as Partial<ProcessRun>)
    expect(stateOf([failed])).toMatchObject({
      state: 'Failed at Merge',
      tone: 'stuck',
      asks: false,
      live: false,
    })
    expect(stateOf([run({ status: 'failed', ledger: [] })])?.state).toBe('Failed')
    expect(stateOf([failed], { ...TICKET, statusCategory: 'done' })).toBeUndefined()
    expect(
      stateOf([run({ id: 'newer', status: 'succeeded', updatedAt: 20 }), failed]),
    ).toBeUndefined()
  })

  it('shows nothing for a run that ended well or was stopped, and nothing with no run', () => {
    expect(stateOf([run({ status: 'succeeded' })])).toBeUndefined()
    expect(stateOf([run({ status: 'cancelled' })])).toBeUndefined()
    expect(stateOf([])).toBeUndefined()
  })

  it('still shows an older run that waits on the person under a newer one that ended', () => {
    const state = stateOf([
      run({ id: 'newer', status: 'succeeded', updatedAt: 20 }),
      run({ id: 'older', ...parkedAt('approval') }),
    ])
    expect(state).toMatchObject({ state: 'Waiting for you: Your approval' })
    expect(state?.open).toEqual({ kind: 'run', projectId: 'osc-be', runId: 'older' })
  })

  it('says a group story’s group run, which opens on the group run', () => {
    expect(stateOf([], WORKED, [groupRun()])).toEqual({
      kind: 'group',
      name: 'Group run',
      state: 'Running',
      label: 'Group run · Running',
      hint: '2 projects · 0 merged',
      tone: 'running',
      asks: false,
      live: true,
      open: { kind: 'group-run', groupRunId: 'gr1', groupStoryId: 'gs1' },
    })
    expect(
      stateOf([], WORKED, [
        groupRun({
          status: 'parked',
          park: { reason: 'sign-off', message: 'Sign off the group' },
        } as Partial<ProcessGroupRun>),
      ]),
    ).toMatchObject({ state: 'Waiting for you: Sign off', asks: true, hint: 'Sign off the group' })
    expect(
      stateOf([], WORKED, [
        groupRun({
          status: 'parked',
          park: { reason: 'integration-failed', message: 'osc-be did not merge' },
        } as Partial<ProcessGroupRun>),
      ]),
    ).toMatchObject({ state: 'Waiting for you', asks: true, hint: 'osc-be did not merge' })
    expect(
      stateOf([], WORKED, [
        groupRun({
          legs: [{ id: 'l1', projectId: 'osc-be', status: 'waiting' }],
        } as Partial<ProcessGroupRun>),
      ]),
    ).toMatchObject({ state: 'Waiting', asks: false, live: false })
    expect(
      stateOf([], WORKED, [groupRun({ status: 'failed', error: 'Out of money' })]),
    ).toMatchObject({
      state: 'Failed',
      tone: 'stuck',
      hint: 'Out of money',
      live: false,
    })
    expect(stateOf([], WORKED, [groupRun({ status: 'succeeded' })])).toBeUndefined()
    expect(stateOf([], { key: 'ZNR-800' }, [groupRun()])).toBeUndefined()
  })

  it('says a part story’s own run', () => {
    const own = run({
      id: 'own',
      projectId: 'osc-ui',
      storyId: 's-ui',
      ticketReview: undefined,
      chatContextId: undefined,
      ...at('merge'),
      ledger: [entry('merge')],
    } as Partial<ProcessRun>)
    expect(stateOf([own], WORKED)).toMatchObject({
      kind: 'story',
      label: 'Story run · Merge',
      open: { kind: 'run', projectId: 'osc-ui', runId: 'own' },
    })
  })

  it('shows the run waiting on the person first, then a working one, then a failed one, newest first', () => {
    const working = run({
      id: 'working',
      ...at('merge'),
      ledger: [entry('merge')],
    } as Partial<ProcessRun>)
    const asking = groupRun({
      status: 'parked',
      park: { reason: 'sign-off', message: 'm' },
    } as Partial<ProcessGroupRun>)
    const ticket = { ...WORKED, key: 'ZNR-756' }
    expect(stateOf([working], ticket, [asking])?.kind).toBe('group')
    expect(stateOf([working], ticket, [groupRun({ status: 'failed' })])?.kind).toBe('review')
    const ownWorking = run({
      id: 'own',
      projectId: 'osc-ui',
      storyId: 's-ui',
      ticketReview: undefined,
      chatContextId: undefined,
      updatedAt: 30,
      ...at('merge'),
    } as Partial<ProcessRun>)
    expect(stateOf([working, ownWorking], ticket)?.kind).toBe('story')
  })
})

const mergeJob = (over: Partial<ReviewMergeJob> = {}): ReviewMergeJob => ({
  jobId: 'j1',
  groupId: GROUP,
  ticketKey: 'ZNR-756',
  round: 2,
  state: 'running',
  startedAt: '2026-11-19T21:00:00.000Z',
  pullRequests: [
    { url: 'https://github.com/acme/compass-be/pull/392', state: 'merged' },
    {
      url: 'https://github.com/acme/compass-web-user/pull/302',
      state: 'waiting-for-checks',
      detail: 'Waiting for Playwright',
    },
  ],
  ...over,
})

describe('ticketRunState while its review run merges', () => {
  const merging = run({ ...at('merge'), ledger: [entry('merge')] } as Partial<ProcessRun>)
  const said = (job: ReviewMergeJob | undefined, over: Partial<ProcessRun> = {}) =>
    ticketRunState(
      TICKET,
      ticketRunIndex(GROUP, [{ ...merging, ...over } as ProcessRun], []),
      NOW,
      job ? { 'ZNR-756': job } : {},
    )

  it('says how the merge of the run’s round goes, pull request by pull request', () => {
    expect(said(mergeJob())).toMatchObject({
      label: 'Review run · Merging · 1 of 2 merged · waiting for checks on compass-web-user #302',
      hint: 'Merge',
      live: true,
      asks: false,
    })
  })

  it('says the run’s own step once that merge ended, for another round, or while the run waits', () => {
    expect(said(mergeJob({ state: 'merged' }))?.state).toBe('Merge')
    expect(said(mergeJob({ round: 1 }))?.state).toBe('Merge')
    expect(said(undefined)?.state).toBe('Merge')
    expect(said(mergeJob(), parkedAt('push-approval'))?.state).toBe(
      'Waiting for you: Approve the push',
    )
  })
})

describe('ticketRunMergeKeys', () => {
  it('names the tickets whose review run works now, whose merge is read', () => {
    const index = ticketRunIndex(
      GROUP,
      [
        run({ id: 'working' }),
        run({
          id: 'waiting',
          ticketReview: { groupId: GROUP, ticketKey: 'ZNR-2', round: 1 },
          ...parkedAt('approval'),
        }),
        run({
          id: 'old',
          status: 'succeeded',
          ticketReview: { groupId: GROUP, ticketKey: 'ZNR-3', round: 1 },
        }),
      ],
      [],
    )
    expect(ticketRunMergeKeys(index)).toEqual(['ZNR-756'])
  })
})
