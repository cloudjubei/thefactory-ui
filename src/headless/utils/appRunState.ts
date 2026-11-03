import { processRunStopHolder } from 'thefactory-tools/utils'
import type { ProcessRun } from 'thefactory-tools/types'
import { buildBridgePush, type BridgeRequest } from './appBridge'
import { RUN_CHANGED_MESSAGE } from './appBridgeConstants'
import { APP_RUN_QUERY_INVALID, APP_RUN_SIGN_OFF_ASK } from './appRunStateConstants'
import type {
  AppRunChangedPayload,
  AppRunQuery,
  AppRunState,
  AppRunStateKind,
} from './appRunStateTypes'

const ENDED: Partial<Record<ProcessRun['status'], AppRunStateKind>> = {
  succeeded: 'done',
  failed: 'failed',
  cancelled: 'stopped',
}

function kindOf(root: ProcessRun, now: number): AppRunStateKind {
  const ended = ENDED[root.status]
  if (ended) return ended
  if (root.status === 'pending') return 'queued'
  if (root.status !== 'parked') return 'running'
  if (root.park?.reason === 'waiting-on-blockers') return 'queued'
  return processRunStopHolder(root, now) === 'manager' ? 'running' : 'waiting'
}

function stepNameOf(run: ProcessRun): string | undefined {
  const stepId = run.park?.stepId ?? run.cursor?.stepId
  return run.plan.steps.find((s) => s.id === stepId)?.name
}

/**
 * The nested run the step `run` is on is working — the one its stop mirrors, or the open
 * attempt's — or none once `run` ended or its step runs no nested run. Pure.
 */
export function openChildRunId(run: ProcessRun): string | undefined {
  if (ENDED[run.status]) return undefined
  if (run.park?.childRunId) return run.park.childRunId
  const stepId = run.cursor?.stepId
  return [...run.ledger]
    .reverse()
    .find((e) => e.stepId === stepId && e.status === 'running' && e.childRunId)?.childRunId
}

/**
 * Where work an app started stands: `chain` is the run, then the nested runs its current step is
 * working, outermost first. The state is the run's own — its stop is the person's unless its
 * agent manager is on it — and the step is read down the chain. Pure.
 */
export function appRunStateOf(chain: readonly ProcessRun[], now: number): AppRunState {
  const root = chain[0]!
  const state = kindOf(root, now)
  const live = state !== 'done' && state !== 'failed' && state !== 'stopped'
  const steps = live ? chain.map(stepNameOf).filter((s): s is string => !!s) : []
  const ask =
    state === 'waiting'
      ? root.park?.reason === 'gate'
        ? APP_RUN_SIGN_OFF_ASK
        : (root.park?.ask?.title ?? root.park?.message)
      : undefined
  return {
    id: root.id,
    ...(root.storyId ? { storyId: root.storyId } : {}),
    title: root.title,
    state,
    ...(steps.length ? { step: steps.join(' · ') } : {}),
    ...(ask ? { ask } : {}),
    updatedAt: Math.max(...chain.map((r) => r.updatedAt)),
  }
}

/** Which run an app's `overseer:run.read` names, or why it names none. Pure. */
export function appRunQueryOf(payload: unknown): AppRunQuery | { error: string } {
  const rec =
    typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : {}
  const runId = typeof rec.runId === 'string' ? rec.runId.trim() : ''
  if (runId) return { runId }
  const storyId = typeof rec.storyId === 'string' ? rec.storyId.trim() : ''
  if (storyId) return { storyId }
  return { error: APP_RUN_QUERY_INVALID }
}

function signatureOf(run: ProcessRun, now: number): string {
  return JSON.stringify([
    run.status,
    run.cursor?.stepId,
    run.cursor?.iteration,
    run.park?.reason,
    run.park?.stepId,
    run.park?.childRunId,
    run.park?.ask?.title,
    processRunStopHolder(run, now),
  ])
}

/**
 * The `overseer:run.changed` pushes for one mounted app, from the host's run updates: one for a
 * run of the app's project the first time it is seen and whenever its state, step or ask changes
 * — never for a cost or clock tick, never for another project's run — and one for a deleted run
 * the app was told of.
 */
export class AppRunChangeFilter {
  private readonly _seen = new Map<string, string>()

  next(projectId: string, update: unknown, now: number): BridgeRequest | null {
    if (typeof update !== 'object' || update === null) return null
    const { runId, run, deleted } = update as {
      runId?: unknown
      run?: ProcessRun
      deleted?: unknown
    }
    if (typeof runId !== 'string') return null
    if (deleted === true) {
      if (!this._seen.delete(runId)) return null
      return buildBridgePush(RUN_CHANGED_MESSAGE, { runId } satisfies AppRunChangedPayload)
    }
    if (!run || run.id !== runId || run.projectId !== projectId) return null
    const signature = signatureOf(run, now)
    if (this._seen.get(runId) === signature) return null
    this._seen.set(runId, signature)
    const payload: AppRunChangedPayload = {
      runId,
      ...(run.storyId ? { storyId: run.storyId } : {}),
      ...(run.parentRunId ? { parentRunId: run.parentRunId } : {}),
    }
    return buildBridgePush(RUN_CHANGED_MESSAGE, payload)
  }
}
