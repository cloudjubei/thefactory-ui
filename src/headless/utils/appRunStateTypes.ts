/**
 * Where work an app started stands, as the app reads it (`overseer:run.read`):
 * queued — waiting to start, or on other work; running — at work, or its agent manager is on a
 * stop; waiting — on the person; done, failed or stopped once it ended.
 */
export type AppRunStateKind = 'queued' | 'running' | 'waiting' | 'done' | 'failed' | 'stopped'

/** One run, as `overseer:run.read` answers it. */
export interface AppRunState {
  id: string
  storyId?: string
  title: string
  state: AppRunStateKind
  /** Where it is or waits — nested runs joined with ' · '. Absent once it ended. */
  step?: string
  /** What it waits on the person for, while `waiting`. */
  ask?: string
  /** When anything in it last changed, epoch ms. */
  updatedAt: number
}

/** Which run `overseer:run.read` reads: by its id, or a story's newest. */
export type AppRunQuery = { runId: string } | { storyId: string }

/** The `overseer:run.changed` push: a run of the project changed state, step or ask. */
export interface AppRunChangedPayload {
  runId: string
  storyId?: string
  parentRunId?: string
}
