import type { WorkQueueRowState, WorkQueueTone } from './workQueueTypes'

export const WORK_QUEUE_COPY = {
  title: 'Queue',
  empty: 'Nothing queued. Add a story and it starts once a slot is free.',
  add: 'Add',
  addPick: 'Story to queue',
  remove: 'Remove',
  moveUp: 'Move up',
  moveDown: 'Move down',
  skipsPlanning: 'No planning',
  capLine: (live: number, cap: number): string => `${live} of ${cap} running`,
  capReached: 'Cap reached: the next start waits for a run to finish.',
  waitingLine: (count: number): string =>
    count === 1 ? '1 run waiting for a slot' : `${count} runs waiting for a slot`,
  waitingOn: (names: readonly string[]): string => `Waits on ${names.join(', ')}`,
  notReady: 'Not ready, and planning is off for it',
  moveFailed: 'The queue did not change.',
  addFailed: 'It was not queued.',
  removeFailed: 'It is still queued.',
  loadFailed: 'The queue could not be read.',
} as const

export const WORK_QUEUE_STATE_LABELS: Readonly<Record<WorkQueueRowState, string>> = {
  next: 'Next',
  slot: 'Waiting for a slot',
  blocked: 'Waiting on blockers',
  'not-ready': 'Not ready',
  running: 'Running',
  done: 'Done',
  queued: 'Queued',
}

/** How each state's chip is toned, by the status tokens. */
export const WORK_QUEUE_STATE_TONES: Readonly<Record<WorkQueueRowState, WorkQueueTone>> = {
  next: 'review',
  slot: 'queued',
  blocked: 'on_hold',
  'not-ready': 'on_hold',
  running: 'running',
  done: 'done',
  queued: 'empty',
}
