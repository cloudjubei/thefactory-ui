import type { ProcessFeatureClosureStatus, ProcessRetryMode } from 'thefactory-tools/types'

import { processRunClosureOfRows } from './processRunClosureView'
import type { ProcessRunClosureRow } from './processRunClosureViewTypes'
import type { RunProposalEdit, RunProposalEditState } from './runProposalViewTypes'

const record = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}

const isMode = (value: unknown): value is ProcessRetryMode =>
  value === 'continue' || value === 'fresh'

const STATUSES: readonly string[] = ['pending', 'blocked', 'deferred', 'done']

function retryOf(value: unknown): RunProposalEdit['retry'] {
  const r = record(value)
  if (typeof r.canContinue !== 'boolean' || !isMode(r.defaultMode)) return undefined
  return {
    canContinue: r.canContinue,
    defaultMode: r.defaultMode,
    reason: typeof r.reason === 'string' ? r.reason : '',
  }
}

function turnLimitOf(value: unknown, runner: unknown): RunProposalEdit['turnLimit'] {
  const t = record(value)
  if (typeof t.limitTurns !== 'boolean' || typeof t.maxTurns !== 'number') return undefined
  return {
    limit: { limitTurns: t.limitTurns, maxTurns: t.maxTurns },
    runner: runner === 'cli' ? 'cli' : 'api',
  }
}

function closureOf(value: unknown): ProcessRunClosureRow[] | undefined {
  if (!Array.isArray(value)) return undefined
  const rows: ProcessRunClosureRow[] = []
  for (const raw of value) {
    const f = record(raw)
    if (typeof f.featureId !== 'string') continue
    const status = STATUSES.includes(String(f.status)) ? String(f.status) : 'pending'
    const suggested = STATUSES.includes(String(f.suggested)) ? String(f.suggested) : status
    rows.push({
      featureId: f.featureId,
      title: typeof f.title === 'string' ? f.title : f.featureId,
      currentStatus: typeof f.currentStatus === 'string' ? f.currentStatus : '',
      suggested: suggested as ProcessFeatureClosureStatus,
      why: typeof f.why === 'string' ? f.why : '',
      work: Array.isArray(f.work) ? f.work.filter((w): w is string => typeof w === 'string') : [],
      status: status as ProcessFeatureClosureStatus,
      reason: typeof f.reason === 'string' ? f.reason : '',
    })
  }
  return rows.length > 0 ? rows : undefined
}

/** What a run action's card lets the person change, read from what the host stated on it. */
export function runProposalEdit(hostDetail: Record<string, unknown>): RunProposalEdit | undefined {
  const retry = retryOf(hostDetail.retry)
  const turnLimit = turnLimitOf(hostDetail.turnLimit, hostDetail.runner)
  const closure = closureOf(hostDetail.features)
  if (!retry && !turnLimit && !closure) return undefined
  return {
    ...(retry ? { retry } : {}),
    ...(turnLimit ? { turnLimit } : {}),
    ...(closure ? { closure } : {}),
  }
}

/** The picks a card starts from: what the host stated — the person's choice, or the default. */
export function runProposalEditStart(
  edit: RunProposalEdit,
  hostDetail: Record<string, unknown>,
): RunProposalEditState {
  const chosen = record(hostDetail.retry).retryMode
  return {
    ...(edit.retry ? { retryMode: isMode(chosen) ? chosen : edit.retry.defaultMode } : {}),
    ...(edit.turnLimit ? { turnLimit: edit.turnLimit.limit } : {}),
    ...(edit.closure ? { closure: edit.closure } : {}),
  }
}

/** The arguments the picks change, sent with the approval — the card's tool reads them as its own. */
export function runProposalEditArgs(state: RunProposalEditState): Record<string, unknown> {
  return {
    ...(state.retryMode ? { retryMode: state.retryMode } : {}),
    ...(state.turnLimit ? { turnLimit: state.turnLimit } : {}),
    ...(state.closure ? { features: processRunClosureOfRows(state.closure) } : {}),
  }
}
