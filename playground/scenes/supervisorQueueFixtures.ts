import { useMemo, useState } from 'react'
import type { ProcessProposal, WorkQueue, WorkQueueEntry } from 'thefactory-tools/types'
import {
  withQueueEntryAdded,
  withQueueEntryMoved,
  withQueueEntryRemoved,
  workQueueEntryKey,
} from 'thefactory-tools/utils'
import {
  storyLaunchGrant,
  storyReadinessView,
  supervisorPanelView,
  workQueueMoveIndex,
  workQueueView,
  type PendingToolGrant,
  type ScopeStop,
  type StoryReadinessView,
  type SupervisorRecord,
  type UseSupervisor,
  type UseWorkQueue,
  type WorkQueueCandidate,
  type WorkQueueEntryStates,
  type WorkQueueSlots,
} from 'thefactory-ui/headless'
import { FAKE_PROCESS_RUN_STATISTICS } from '../../src/fakeBackend/fixtures/processRuns'
import { FAKE_DATA_STORY_ID, fakeDataLaunchProposal } from './fakeDataInProductFixtures'
import type { FixtureRoutes } from './onFixtures'

const PROJECT = 'thefactory-tools'
const GROUP = 'thefactory'
const AT = Date.UTC(2026, 10, 23, 9, 0)
const MINUTE = 60_000

const story = (storyId: string, planning?: false): WorkQueueEntry => ({
  kind: 'story',
  projectId: PROJECT,
  storyId,
  ...(planning === false ? { planning } : {}),
})

const ENTRIES: readonly WorkQueueEntry[] = [
  story('queue-panel'),
  story('supervisor-panel'),
  story('plan-first'),
  { kind: 'groupStory', groupId: GROUP, groupStoryId: 'run-throughs' },
  story('readiness-badge', false),
  story('slots-route'),
]

const TITLES: Readonly<Record<string, string>> = {
  'story:thefactory-tools/queue-panel': 'Queue panel for a project, a group and the Overseer',
  'story:thefactory-tools/supervisor-panel': 'Supervisor panel: on/off, what it did, what it asks',
  'story:thefactory-tools/plan-first': 'Plan first on launches',
  'groupStory:thefactory/run-throughs': 'Run-throughs on every project',
  'story:thefactory-tools/readiness-badge': 'Readiness badge on stories',
  'story:thefactory-tools/slots-route': 'Run slots route',
  'story:thefactory-tools/video-digest': 'Video digest, round 2',
  'story:thefactory-tools/tool-slips': 'Tool-call slips page',
}

const STATES: WorkQueueEntryStates = {
  'story:thefactory-tools/queue-panel': { running: true },
  'story:thefactory-tools/supervisor-panel': { ready: true },
  'story:thefactory-tools/plan-first': { ready: false },
  'groupStory:thefactory/run-throughs': { waitingOn: ['Remote browser', 'Tester role'] },
  'story:thefactory-tools/readiness-badge': { ready: false },
  'story:thefactory-tools/slots-route': { done: true },
}

/** Where the queue panel is shown. */
export type QueueCase = 'empty' | 'mixed' | 'cap-reached'

export const QUEUE_CASES: readonly { id: QueueCase; label: string; note: string }[] = [
  {
    id: 'empty',
    label: 'Empty',
    note: 'Nothing queued: one line says so, and the cap in use still shows. Add offers the project’s stories.',
  },
  {
    id: 'mixed',
    label: 'Every state',
    note: 'Running, next, waiting for a slot, waiting on blockers, not ready with planning off, and done; 9 of 10 running, so one starts next and the other waits for a slot.',
  },
  {
    id: 'cap-reached',
    label: 'Cap reached',
    note: '10 of 10 running and one run waiting for a slot: nothing starts, and every startable entry waits for a slot.',
  },
]

export const queueCase = (value: string | null | undefined): QueueCase =>
  QUEUE_CASES.find((c) => c.id === value)?.id ?? 'mixed'

const SLOTS: Readonly<Record<QueueCase, WorkQueueSlots>> = {
  empty: { cap: 10, live: 3, waiting: [] },
  mixed: { cap: 10, live: 9, waiting: [] },
  'cap-reached': {
    cap: 10,
    live: 10,
    waiting: [
      { runId: 'run-late', projectId: PROJECT, title: 'Tool-call slips page', position: 1 },
    ],
  },
}

/** Stories the person may add, the queued ones among them. */
export const QUEUE_CANDIDATES: readonly WorkQueueCandidate[] = [
  { entry: story('queue-panel'), title: TITLES['story:thefactory-tools/queue-panel']! },
  { entry: story('video-digest'), title: TITLES['story:thefactory-tools/video-digest']! },
  { entry: story('tool-slips'), title: TITLES['story:thefactory-tools/tool-slips']! },
]

/**
 * The queue panel's hook on the board: the case's queue and slots, changed in
 * the page as the real hook changes it on the routes — moves, adds and removes
 * show at once, and nothing goes to a server.
 */
export function useBoardWorkQueue(which: QueueCase): UseWorkQueue {
  const [queue, setQueue] = useState<WorkQueue>(() => ({
    scope: { kind: 'project', projectId: PROJECT },
    entries: which === 'empty' ? [] : [...ENTRIES],
  }))
  const view = useMemo(
    () =>
      workQueueView(queue, {
        slots: SLOTS[which],
        states: STATES,
        titles: TITLES,
      }),
    [queue, which],
  )
  const change = (next: (entries: WorkQueueEntry[]) => WorkQueueEntry[]) =>
    setQueue((q) => ({ ...q, entries: next(q.entries) }))
  const move = (entry: WorkQueueEntry, index: number) =>
    change((entries) => withQueueEntryMoved(entries, entry, index))
  const step = (entry: WorkQueueEntry, by: 1 | -1) =>
    change((entries) => {
      const to = workQueueMoveIndex(entries, entry, by)
      return to === undefined ? entries : withQueueEntryMoved(entries, entry, to)
    })
  return {
    view,
    loading: false,
    moveUp: (entry) => step(entry, -1),
    moveDown: (entry) => step(entry, 1),
    move,
    add: (entry, index) =>
      change((entries) =>
        entries.some((e) => workQueueEntryKey(e) === workQueueEntryKey(entry))
          ? entries
          : withQueueEntryAdded(entries, entry, index),
      ),
    remove: (entry) => change((entries) => withQueueEntryRemoved(entries, entry)),
    refresh: () => {},
  }
}

const ACTIONS: SupervisorRecord['actions'] = [
  {
    id: 'act-retry',
    at: AT - 52 * MINUTE,
    kind: 'answered',
    what: 'Retried Checks on “Plan first on launches”',
    runId: 'run-plan-first',
    projectId: PROJECT,
    choice: 'retry',
    result: 'Checks passed on the retry: the failure was the flaky watcher test.',
  },
  {
    id: 'act-model',
    at: AT - 40 * MINUTE,
    kind: 'answered',
    what: 'Moved “Run-throughs” to claude-sonnet-4-5 after a credit stop',
    runId: 'run-run-throughs',
    projectId: PROJECT,
    tool: 'setRunModel',
    result: 'The run carried on on the fallback model.',
  },
  {
    id: 'act-moot',
    at: AT - 31 * MINUTE,
    kind: 'closed-ask',
    what: 'Closed the ask about the stale base on “Queue panel”',
    runId: 'run-queue-panel',
    projectId: PROJECT,
    result: 'Already handled: the base was brought in by the run’s own retry.',
  },
  {
    id: 'act-start',
    at: AT - 12 * MINUTE,
    kind: 'started',
    what: 'Started “Supervisor panel: on/off, what it did, what it asks”',
    projectId: PROJECT,
  },
  {
    id: 'act-refused',
    at: AT - 4 * MINUTE,
    kind: 'refused',
    what: 'Could not start “Readiness badge on stories”',
    projectId: PROJECT,
    result: 'Not ready, and planning is off for it.',
  },
]

const STOP_BASE = {
  rootRunId: 'run-queue-panel',
  signature: 'sig',
  managerHandling: false,
  projectId: PROJECT,
  manager: { on: true, handling: false, escalated: false },
}

const STOPS: ScopeStop[] = [
  {
    ...STOP_BASE,
    runId: 'run-queue-panel',
    parkedAt: AT - 6 * MINUTE,
    reason: 'step-failed',
    stepId: 'checks',
    stepName: 'Checks',
    detail: 'main fails its own checks.',
    title: TITLES['story:thefactory-tools/queue-panel']!,
    forPerson: {
      question: 'main fails its own checks before this run’s change. Fix main first, or carry on?',
      recommended: {
        choice: 'retry',
        label: 'Fix main first',
        note: 'A base-fix run, then this run re-checks',
      },
      options: [
        {
          choice: 'retry',
          label: 'Fix main first',
          note: 'A base-fix run, then this run re-checks',
        },
        { choice: 'continue', label: 'Carry on', note: 'Accept the break as known' },
      ],
    },
    asks: [],
  },
  {
    ...STOP_BASE,
    runId: 'run-signoff',
    rootRunId: 'run-signoff',
    parkedAt: AT - 2 * MINUTE,
    reason: 'gate',
    stepId: 'sign-off',
    stepName: 'Sign-off',
    detail: 'The sign-off diff adds a proof file.',
    title: 'Video digest, round 2',
    forPerson: {
      question: 'The diff adds src/proof/fakeTimeline.ts, a proof file. Send it back to drop it?',
      recommended: { choice: 'rework', label: 'Send it back', note: 'Drop the proof file' },
      options: [
        { choice: 'rework', label: 'Send it back', note: 'Drop the proof file' },
        { choice: 'approve', label: 'Approve as it is' },
      ],
    },
    asks: [{ actionId: 'ask-1', kind: 'tool', toolName: 'writeFile' }],
  },
] as ScopeStop[]

/** Where the supervisor panel is shown. */
export type SupervisorCase = 'on' | 'off' | 'quiet'

export const SUPERVISOR_CASES: readonly { id: SupervisorCase; label: string; note: string }[] = [
  {
    id: 'on',
    label: 'On, with actions and asks',
    note: 'Two stops handed over, each with its answers ready and the recommended one first; five things it did, newest first, on the manager’s Handled cards.',
  },
  {
    id: 'off',
    label: 'Off',
    note: 'Switched off: every stop waits for the person. What it did before stays listed, and the stops still show their ready answers.',
  },
  {
    id: 'quiet',
    label: 'On, nothing yet',
    note: 'Switched on with nothing done and nothing waiting.',
  },
]

export const supervisorCase = (value: string | null | undefined): SupervisorCase =>
  SUPERVISOR_CASES.find((c) => c.id === value)?.id ?? 'on'

/** The supervisor panel's hook on the board: the case's record, the switch flipping in the page. */
export function useBoardSupervisor(which: SupervisorCase): UseSupervisor {
  const [enabled, setEnabled] = useState(which !== 'off')
  const quiet = which === 'quiet'
  const record: SupervisorRecord = {
    scope: { kind: 'project', projectId: PROJECT },
    enabled,
    actions: quiet ? [] : ACTIONS,
    fallbackModel: { runner: 'cli', cli: 'claude', model: 'claude-sonnet-4-5' },
  }
  return {
    view: supervisorPanelView(record, quiet ? [] : STOPS),
    loading: false,
    setEnabled,
    toggle: () => setEnabled((on) => !on),
    refresh: () => {},
  }
}

/** Where the readiness badge is shown. */
export type ReadinessCase = 'ready' | 'problems'

export const READINESS_CASES: readonly { id: ReadinessCase; label: string; note: string }[] = [
  {
    id: 'ready',
    label: 'Ready',
    note: 'A spec, a plan, and every open feature has acceptance, a plan and context.',
  },
  {
    id: 'problems',
    label: 'With problems',
    note: 'No plan; one feature without acceptance, one without context, one with an open question. Press the badge for the list; a feature’s line opens it.',
  },
]

export const readinessCase = (value: string | null | undefined): ReadinessCase =>
  READINESS_CASES.find((c) => c.id === value)?.id ?? 'problems'

const FEATURE = {
  status: 'pending',
  acceptance: 'It works against the routes.',
  plan: '1. Hook. 2. Panels.',
  context: ['src/headless'],
}

export function readinessFixture(which: ReadinessCase): StoryReadinessView {
  return storyReadinessView({
    description: 'Queue, supervisor and planning on screen.',
    plan: which === 'ready' ? '1. Queue. 2. Supervisor. 3. Planning.' : '',
    blockers: [],
    features:
      which === 'ready'
        ? [{ ...FEATURE, id: 'f1', title: 'Queue panel' }]
        : [
            { ...FEATURE, id: 'f1', title: 'Queue panel', acceptance: '' },
            { ...FEATURE, id: 'f2', title: 'Supervisor panel', context: [] },
            {
              ...FEATURE,
              id: 'f3',
              title: 'Plan first',
              questions: [{ id: 'q1', question: 'Where does the toggle sit?', status: 'open' }],
            },
          ],
  } as never)
}

/** Where the launch card's Plan first toggle is shown. */
export type PlanFirstCase = 'on' | 'off' | 'not-offered'

export const PLAN_FIRST_CASES: readonly { id: PlanFirstCase; label: string; note: string }[] = [
  {
    id: 'on',
    label: 'On by default',
    note: 'The story’s process plans first: the toggle shows, on. Start run sends no planning, so the run plans first.',
  },
  {
    id: 'off',
    label: 'Off',
    note: 'The agent’s ask turned planning off, so the toggle starts off; Start run sends planning: false.',
  },
  {
    id: 'not-offered',
    label: 'Not offered',
    note: 'The process has no plan step: the card shows no toggle and sends none.',
  },
]

export const planFirstCase = (value: string | null | undefined): PlanFirstCase =>
  PLAN_FIRST_CASES.find((c) => c.id === value)?.id ?? 'on'

/** The reads the launch card makes, its preview saying whether the run plans first. */
export function planFirstLaunchRoutes(which: PlanFirstCase): FixtureRoutes {
  const preview = (): ProcessProposal & { planning: boolean } => {
    const own = fakeDataLaunchProposal('no-screens')
    return {
      ...own,
      steps:
        which === 'not-offered'
          ? own.steps
          : [
              { id: 'plan', name: 'Plan', kind: 'agent', agent: true, agentRole: 'planner' },
              ...own.steps,
            ],
      planning: which !== 'not-offered',
    }
  }
  return {
    'POST /api/v1/processes/preview': (_, __, body) =>
      (body as { planning?: boolean } | undefined)?.planning === false
        ? { ...preview(), steps: preview().steps.filter((s) => s.id !== 'plan'), planning: false }
        : preview(),
    '/api/v1/process-runs/statistics': () => FAKE_PROCESS_RUN_STATISTICS,
    '/api/v1/projects/{projectId}/notes': () => [],
    '/api/v1/projects/{projectId}/stories/order': () => [FAKE_DATA_STORY_ID],
  }
}

/** The story launch for the case; the ask turns planning off for `off`. */
export function planFirstGrant(
  which: PlanFirstCase,
  onLaunch: (metadata: Record<string, unknown>) => void,
): PendingToolGrant {
  const grant = storyLaunchGrant({
    storyId: FAKE_DATA_STORY_ID,
    chatRunner: 'api',
    onLaunch: async (metadata) => onLaunch(metadata),
    onCancel: () => {},
  })
  if (which !== 'off') return grant
  const args = { ...(grant.args as Record<string, unknown>), planning: false }
  return { ...grant, args, detail: { tool: grant.toolName, args } }
}

/** What Start run sent of planning, as the scenes show it. */
export const planFirstSentLine = (sent: Record<string, unknown>): string =>
  `Sent planning: ${JSON.stringify(sent.planning ?? null)}`
