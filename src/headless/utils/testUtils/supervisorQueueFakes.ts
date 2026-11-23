import type { WorkQueueEntry } from 'thefactory-tools/types'

import type { UseSupervisor } from '../../hooks/useSupervisor'
import type { UseWorkQueue } from '../../hooks/useWorkQueue'
import { supervisorPanelView } from '../supervisorPanel'
import type { ScopeStop, SupervisorRecord } from '../supervisorPanelTypes'
import { workQueueView } from '../workQueue'

export const FAKE_QUEUE_A: WorkQueueEntry = { kind: 'story', projectId: 'tools', storyId: 'a' }
export const FAKE_QUEUE_B: WorkQueueEntry = { kind: 'story', projectId: 'tools', storyId: 'b' }
export const FAKE_QUEUE_C: WorkQueueEntry = { kind: 'story', projectId: 'tools', storyId: 'c' }

type Spy = (...args: any[]) => void

/** A queue panel's hook answer on three stories: running, next and waiting on a blocker. */
export function fakeWorkQueue(spy: () => Spy, empty = false): UseWorkQueue {
  const entries = empty ? [] : [FAKE_QUEUE_A, FAKE_QUEUE_B, FAKE_QUEUE_C]
  return {
    view: workQueueView(
      { scope: { kind: 'project', projectId: 'tools' }, entries },
      {
        slots: { cap: 10, live: 7, waiting: [] },
        states: {
          'story:tools/a': { running: true },
          'story:tools/b': { ready: true },
          'story:tools/c': { waitingOn: ['Login API'] },
        },
        titles: { 'story:tools/a': 'Alpha', 'story:tools/b': 'Beta', 'story:tools/c': 'Gamma' },
      },
    ),
    loading: false,
    moveUp: spy(),
    moveDown: spy(),
    move: spy(),
    add: spy(),
    remove: spy(),
    refresh: spy(),
  }
}

export const FAKE_SUPERVISOR_RECORD: SupervisorRecord = {
  scope: { kind: 'project', projectId: 'tools' },
  enabled: true,
  agent: true,
  actions: [
    {
      id: 'act-1',
      at: 1_000,
      kind: 'answered',
      what: 'Retried Implement after a flaky check',
      runId: 'r1',
      projectId: 'tools',
      choice: 'retry',
      result: 'The step passed on the retry.',
    },
  ],
}

export const FAKE_SUPERVISOR_STOP = {
  runId: 'r2',
  rootRunId: 'r2',
  parkedAt: 5_000,
  reason: 'step-failed',
  stepName: 'Implement',
  detail: 'main fails its own checks.',
  signature: 'sig',
  managerHandling: false,
  projectId: 'tools',
  title: 'Queue panel',
  forPerson: {
    question: 'main fails its own checks. Fix main first, or carry on?',
    recommended: { choice: 'retry', label: 'Fix main first' },
    options: [
      { choice: 'retry', label: 'Fix main first' },
      { choice: 'continue', label: 'Carry on' },
    ],
  },
  asks: [],
  manager: { on: true, handling: false, escalated: false },
} as unknown as ScopeStop

/** A supervisor panel's hook answer: on, one thing done, one stop handed over. */
export function fakeSupervisor(spy: () => Spy, enabled = true): UseSupervisor {
  return {
    view: supervisorPanelView({ ...FAKE_SUPERVISOR_RECORD, enabled }, [FAKE_SUPERVISOR_STOP]),
    loading: false,
    setEnabled: spy(),
    toggle: spy(),
    refresh: spy(),
  }
}
