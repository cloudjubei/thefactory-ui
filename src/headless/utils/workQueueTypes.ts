import type { WorkQueueEntry, WorkQueueEntryState, WorkQueueScope } from 'thefactory-tools/types'

/** Where an entry of the queue stands, as its row says it. */
export type WorkQueueRowState =
  | 'next'
  | 'slot'
  | 'blocked'
  | 'not-ready'
  | 'running'
  | 'done'
  | 'queued'

/** The status token a state's chip takes. */
export type WorkQueueTone = 'empty' | 'done' | 'running' | 'on_hold' | 'review' | 'queued'

/** The live process runs against the cap, and the runs waiting for a slot. */
export interface WorkQueueSlots {
  cap: number
  live: number
  waiting: readonly { runId: string; projectId: string; title: string; position: number }[]
}

/** What the host knows of each queued entry, by `workQueueEntryKey`. */
export type WorkQueueEntryStates = Readonly<Record<string, WorkQueueEntryState>>

/** Each queued entry's title, by `workQueueEntryKey`; the work's id reads in its place. */
export type WorkQueueTitles = Readonly<Record<string, string>>

/** One row of the queue panel. */
export interface WorkQueueRowView {
  key: string
  entry: WorkQueueEntry
  title: string
  /** The project or group the work belongs to. */
  where: string
  state: WorkQueueRowState
  stateLabel: string
  tone: WorkQueueTone
  /** What it waits on, or why it does not start. */
  detail?: string
  /** Planning is off for it. */
  skipsPlanning: boolean
  index: number
  canMoveUp: boolean
  canMoveDown: boolean
}

/** The queue panel of one scope. */
export interface WorkQueueView {
  scope: WorkQueueScope
  rows: WorkQueueRowView[]
  /** The cap in use, "7 of 10 running"; absent until the slots are read. */
  capLine?: string
  /** No slot is free: queued work waits until a run finishes. */
  capReached: boolean
  /** Runs launched past the cap, waiting their turn. */
  waitingLine?: string
}

/** A story or group story the person may add to the queue. */
export interface WorkQueueCandidate {
  entry: WorkQueueEntry
  title: string
}
