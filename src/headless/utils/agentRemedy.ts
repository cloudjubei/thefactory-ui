// Pure mappers for a mid-run remedy. A remedy rides the same broker action path
// as a permission grant and an askUser question, but it is resolved by choosing
// one of its structured options — these helpers keep that out of the components.

import { REMEDY_ACTION_KIND, REMEDY_FALLBACK_SUMMARY } from './agentRemedyConstants'
import type { AgentRemedy, AgentRemedyDecision, AgentRemedyOption } from './agentRemedyTypes'
import type { CliPendingActionLike } from './pendingToolGrants'
import type { PendingRemedyGrant, PendingToolGrant } from './chatTypes'

/** True when a broker action is a remedy rather than a permission request or question. */
export function isRemedyAction(action: CliPendingActionLike): boolean {
  return action.kind === REMEDY_ACTION_KIND
}

function readText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function parseOptions(value: unknown): AgentRemedyOption[] {
  if (!Array.isArray(value)) return []
  const out: AgentRemedyOption[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    const id = readText(rec.id)
    const kind = rec.kind
    const label = readText(rec.label)
    if (!id || (kind !== 'hint' && kind !== 'agent' && kind !== 'manual')) continue
    const opt: AgentRemedyOption = { id, kind, label: label ?? id }
    const param = readText(rec.param)
    if (param) opt.param = param
    if (Array.isArray(rec.suggestions)) {
      const s = rec.suggestions.filter((x): x is string => typeof x === 'string')
      if (s.length > 0) opt.suggestions = s
    }
    out.push(opt)
  }
  return out
}

/**
 * Parse a broker action's `unknown` payload into a renderable remedy. Never
 * throws: an unreadable payload yields a fallback summary and keeps `raw` so the
 * card can show what the tool actually sent.
 */
export function parseRemedyPayload(payload: unknown): AgentRemedy {
  const rec =
    payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : undefined
  const summary = readText(rec?.summary)
  const remedies = parseOptions(rec?.remedies)
  const parsed: AgentRemedy = {
    tool: readText(rec?.tool) ?? 'a tool',
    summary: summary ?? REMEDY_FALLBACK_SUMMARY,
    remedies,
  }
  const detail = readText(rec?.detail)
  if (detail) parsed.detail = detail
  if (Array.isArray(rec?.attempted)) {
    const a = rec!.attempted.filter((x): x is string => typeof x === 'string')
    if (a.length > 0) parsed.attempted = a
  }
  if (!summary || remedies.length === 0) parsed.raw = payload
  return parsed
}

/** Decision body for choosing a remedy option (with an optional hint value). */
export function remedyChoiceDecision(remedyId: string, value?: string): AgentRemedyDecision {
  const trimmed = value?.trim()
  return {
    outcome: 'approved',
    metadata: { remedyId, ...(trimmed ? { value: trimmed } : {}) },
  }
}

/** Decision body for dismissing a remedy — the run's original error surfaces. */
export function declineRemedyDecision(): AgentRemedyDecision {
  return { outcome: 'denied', metadata: { remedyId: '' } }
}

/** Narrow a unified grant to one the remedy card can render and resolve. */
export function isRemedyGrant(grant: PendingToolGrant): grant is PendingRemedyGrant {
  return grant.remedy !== undefined && typeof grant.resolveRemedy === 'function'
}
