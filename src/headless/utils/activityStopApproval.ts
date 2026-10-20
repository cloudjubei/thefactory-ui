import type {
  ActivityStopCard,
  ActivityStopChildResult,
  ActivityStopResult,
} from 'thefactory-tools/types'
import { isActivityStopCard } from 'thefactory-tools/validations'

import {
  ACTIVITY_STOP_COPY,
  ACTIVITY_STOP_OUTCOME_COPY,
  STOP_ACTIVITY_TOOL_NAME,
} from './activityStopApprovalConstants'
import type { ActivityStopApprovalView, ActivityStopFact } from './activityStopApprovalTypes'
import type { ToolRowMilestone } from './gitSetupApprovalTypes'

type GrantLike = { toolName?: string; args?: unknown; detail?: unknown }

const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}

const text = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim() : undefined

/** Whether an approval is for `stopActivity` — named by the grant or by its payload. Pure. */
export function isActivityStopGrant(grant: GrantLike): boolean {
  return (
    grant.toolName === STOP_ACTIVITY_TOOL_NAME ||
    record(grant.detail).tool === STOP_ACTIVITY_TOOL_NAME
  )
}

/** The arguments the agent asked with. Pure. */
export function activityStopArgs(grant: GrantLike): Record<string, unknown> {
  return grant.args !== undefined ? record(grant.args) : record(record(grant.detail).args)
}

/** The card the host raised the ask with, when this client can read its version. Pure. */
export function activityStopCardOf(grant: GrantLike): ActivityStopCard | undefined {
  const detail = record(grant.detail).detail
  return isActivityStopCard(detail) ? detail : undefined
}

function elapsedText(ms: number): string {
  const total = Math.floor(ms / 1000)
  const parts: Array<[number, string]> = [
    [Math.floor(total / 3600), 'h'],
    [Math.floor((total % 3600) / 60), 'm'],
    [total % 60, 's'],
  ]
  const shown = parts.filter(([n], i) => n > 0 || i === parts.length - 1)
  return shown.map(([n, unit]) => `${n}${unit}`).join(' ')
}

function statusText(card: ActivityStopCard): string {
  if (card.paused) return ACTIVITY_STOP_COPY.status_paused
  return ACTIVITY_STOP_COPY[`status_${card.status}`]
}

function shortId(id: string): string {
  return id.slice(0, 8)
}

function alsoStopsFact(card: ActivityStopCard): ActivityStopFact[] {
  if (!card.liveChildCount) return []
  const types = card.liveChildTypes ?? []
  const count = ACTIVITY_STOP_COPY.alsoStopsCount(card.liveChildCount)
  return [
    {
      label: ACTIVITY_STOP_COPY.alsoStops,
      value: types.length > 0 ? `${count} · ${types.join(', ')}` : count,
    },
  ]
}

function facts(card: ActivityStopCard): ActivityStopFact[] {
  return [
    { label: ACTIVITY_STOP_COPY.type, value: card.activityType ?? card.recordType },
    { label: ACTIVITY_STOP_COPY.status, value: statusText(card) },
    {
      label: ACTIVITY_STOP_COPY.elapsed,
      value: `${elapsedText(card.elapsedMs)} · ${ACTIVITY_STOP_COPY.elapsedHint}`,
    },
    {
      label: ACTIVITY_STOP_COPY.cost,
      value:
        typeof card.costUSD === 'number'
          ? `$${card.costUSD.toFixed(2)}`
          : ACTIVITY_STOP_COPY.costUnknown,
    },
    ...alsoStopsFact(card),
  ]
}

function paramsNotes(card: ActivityStopCard): string[] {
  const notes: string[] = []
  if (card.paramsOmitted === 'none') notes.push(ACTIVITY_STOP_COPY.noParams)
  if (card.paramsOmitted === 'too-large') notes.push(ACTIVITY_STOP_COPY.paramsTooLarge)
  if (card.redactedParams?.length) notes.push(ACTIVITY_STOP_COPY.redacted(card.redactedParams))
  return notes
}

/**
 * The stop's card: a danger card, since the work ends for good, headed by the activity the
 * host read — its type and short id — with the agent's reason shown as the agent's. The facts
 * are the host's snapshot only: no card, no facts, and a line saying they could not be read. Pure.
 */
export function activityStopApprovalView(
  card: ActivityStopCard | undefined,
  args: Record<string, unknown>,
): ActivityStopApprovalView {
  const why = text(args.reason)
  const name = card ? (card.activityType ?? card.recordType) : ACTIVITY_STOP_COPY.unknownType
  const id = card?.activityId ?? text(args.activityId) ?? ''
  const ask = {
    icon: 'stop' as const,
    tone: 'danger' as const,
    ask: ACTIVITY_STOP_COPY.ask,
    tag: ACTIVITY_STOP_COPY.tag,
    headline: id ? `${name} · ${shortId(id)}` : name,
    ...(why ? { why } : {}),
    consequence: ACTIVITY_STOP_COPY.consequence,
    verb: ACTIVITY_STOP_COPY.verb,
    body: { kind: 'details' as const },
  }
  if (!card) {
    return {
      ask,
      facts: [],
      steps: [],
      params: [],
      paramsNotes: [],
      unavailable: ACTIVITY_STOP_COPY.unavailable,
    }
  }
  return {
    ask,
    card,
    facts: facts(card),
    steps: card.steps.map((s) => ({
      key: s.key,
      progress: s.total > 0 ? `${s.done} of ${s.total}` : `${s.done}`,
      status: s.status,
    })),
    params: Object.entries(card.launchParams ?? {}).map(
      ([key, value]) => `${key}: ${JSON.stringify(value)}`,
    ),
    paramsNotes: paramsNotes(card),
  }
}

const OUTCOMES: ReadonlySet<string> = new Set([
  'stopped',
  'noop',
  'not-stopped',
  'failed',
  'refused',
])

function stopResultOf(value: unknown): ActivityStopResult | undefined {
  let parsed: unknown = value
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value)
    } catch {
      return undefined
    }
  }
  const result = record(parsed)
  return typeof result.outcome === 'string' && OUTCOMES.has(result.outcome)
    ? (result as unknown as ActivityStopResult)
    : undefined
}

function outcomeLine(result: ActivityStopResult): ToolRowMilestone {
  const status = result.status ?? 'unknown'
  switch (result.outcome) {
    case 'stopped':
      return { tone: 'success', title: ACTIVITY_STOP_OUTCOME_COPY.stopped }
    case 'noop':
      return { tone: 'neutral', title: ACTIVITY_STOP_OUTCOME_COPY.noop(status) }
    case 'not-stopped':
      return { tone: 'warning', title: ACTIVITY_STOP_OUTCOME_COPY.notStopped(status) }
    case 'failed':
      return { tone: 'warning', title: ACTIVITY_STOP_OUTCOME_COPY.failed }
    case 'refused':
      return {
        tone: 'warning',
        title: ACTIVITY_STOP_OUTCOME_COPY.refused(result.code ?? 'refused'),
      }
  }
}

function childrenLine(
  children: readonly ActivityStopChildResult[],
): { detail: string; unconfirmed: boolean } | undefined {
  if (children.length === 0) return undefined
  const stopped = children.filter((c) => c.outcome === 'stopped').length
  const ended = children.filter((c) => c.outcome === 'noop' || c.outcome === 'not-stopped').length
  const unconfirmed = children.length - stopped - ended
  if (stopped === children.length) {
    return { detail: ACTIVITY_STOP_OUTCOME_COPY.childrenAllStopped(stopped), unconfirmed: false }
  }
  const parts = [ACTIVITY_STOP_OUTCOME_COPY.childrenStopped(stopped, children.length)]
  if (ended > 0) parts.push(ACTIVITY_STOP_OUTCOME_COPY.childrenEnded(ended))
  if (unconfirmed > 0) parts.push(ACTIVITY_STOP_OUTCOME_COPY.childrenUnconfirmed(unconfirmed))
  return { detail: parts.join(' · '), unconfirmed: unconfirmed > 0 }
}

/**
 * The line a carried-out `stopActivity` row shows: what the stop observed, read from the
 * execution its action recorded when that reads as a stop result, else from the row's own
 * result — so the row follows the action, never a copy taken earlier. Only `stopped` reads as
 * done; the activities it started are counted, and any that may still be running make the line
 * a warning. Nothing while the stop waits on the person or for a call that returned no stop. Pure.
 */
export function activityStopMilestone(
  result: unknown,
  resultType: string | undefined,
  awaitingDecision: boolean,
  execution?: unknown,
): ToolRowMilestone | undefined {
  if (awaitingDecision || (resultType !== 'success' && resultType !== 'errored')) return undefined
  const stop = stopResultOf(execution) ?? stopResultOf(result)
  if (!stop) return undefined
  const line = outcomeLine(stop)
  const children = childrenLine(Array.isArray(stop.children) ? stop.children : [])
  if (!children) return line
  return {
    tone: children.unconfirmed && line.tone === 'success' ? 'warning' : line.tone,
    title: line.title,
    detail: children.detail,
  }
}
