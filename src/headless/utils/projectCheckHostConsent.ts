import {
  PROJECT_CHECK_HOST_CONSENT_ALLOW,
  PROJECT_CHECK_HOST_CONSENT_ASK,
  PROJECT_CHECK_HOST_CONSENT_KIND,
  PROJECT_CHECK_HOST_CONSENT_LEAD,
  PROJECT_CHECK_HOST_CONSENT_TITLE,
} from './projectCheckHostConsentConstants'
import type { HostCheckConsentView } from './projectCheckHostConsentTypes'
import type { ToolAskCardView } from './toolAskCardTypes'

const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}

const text = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined

const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((c): c is string => typeof c === 'string' && c.trim() !== '') : []

/**
 * Whether a broker action / waiting request is the host-check consent ask.
 * Pure.
 */
export function isHostCheckConsentKind(kind: string | undefined): boolean {
  return kind === PROJECT_CHECK_HOST_CONSENT_KIND
}

/**
 * Read the host-check consent payload the backend parks with — title, why,
 * commands and check ids. `undefined` when it is not that ask. Pure.
 */
export function hostCheckConsentOf(payload: unknown): HostCheckConsentView | undefined {
  const raw = record(payload)
  const commands = strings(raw.commands)
  if (commands.length === 0) return undefined
  const hostReason = text(raw.hostReason)
  const title = text(raw.title)
  const checkIds = strings(raw.checkIds)
  // Require a consent marker beyond title — title+commands alone is too loose
  // (another grant could put those in detail). Backend parks with hostReason /
  // checkIds; kind on the payload is also enough.
  if (
    hostReason === undefined &&
    checkIds.length === 0 &&
    !isHostCheckConsentKind(text(raw.kind))
  ) {
    return undefined
  }
  return {
    title: title ?? PROJECT_CHECK_HOST_CONSENT_TITLE,
    hostReason: hostReason ?? '',
    commands,
    checkIds,
  }
}

/**
 * The consent ask a waiting request carries, from its action kind or its args
 * (the backend puts the full payload on `request.args`). Pure.
 */
export function hostCheckConsentFromRequest(request: {
  actionKind?: string
  args?: unknown
}): HostCheckConsentView | undefined {
  const fromArgs = hostCheckConsentOf(request.args)
  if (fromArgs) return fromArgs
  if (!isHostCheckConsentKind(request.actionKind)) return undefined
  const raw = record(request.args)
  const commands = strings(raw.commands)
  if (commands.length === 0) return undefined
  return {
    title: text(raw.title) ?? PROJECT_CHECK_HOST_CONSENT_TITLE,
    hostReason: text(raw.hostReason) ?? '',
    commands,
    checkIds: strings(raw.checkIds),
  }
}

/** The park card's words: why, then the lead. Commands are listed beside them. Pure. */
export function hostCheckConsentWords(view: HostCheckConsentView): string {
  return [view.hostReason, PROJECT_CHECK_HOST_CONSENT_LEAD]
    .filter((line) => line.length > 0)
    .join('\n\n')
}

/**
 * Relabel the park's Allow choice as "Allow for this project". Other choices
 * stay as they are. Pure.
 */
export function withHostCheckConsentAllowLabel<T extends { choice: string; label: string }>(
  choices: readonly T[],
): T[] {
  return choices.map((choice) =>
    choice.choice === 'allow' ? { ...choice, label: PROJECT_CHECK_HOST_CONSENT_ALLOW } : choice,
  )
}

/**
 * The tool-ask card for host-check consent: lists the commands and offers
 * Allow for this project (no always-allow scopes — the grant is the project
 * setting). Pure.
 */
export function hostCheckConsentAskView(
  view: HostCheckConsentView,
  why?: string,
): Omit<ToolAskCardView, 'tone'> & { tone: 'ask' } {
  return {
    tone: 'ask',
    icon: 'run',
    ask: PROJECT_CHECK_HOST_CONSENT_ASK.ask,
    tag: PROJECT_CHECK_HOST_CONSENT_ASK.tag,
    headline: view.title,
    ...(why ? { why } : view.hostReason ? { why: view.hostReason } : {}),
    consequence: PROJECT_CHECK_HOST_CONSENT_ASK.consequence,
    verb: PROJECT_CHECK_HOST_CONSENT_ASK.verb,
    body: {
      kind: 'host-check-consent',
      lead: PROJECT_CHECK_HOST_CONSENT_LEAD,
      commands: [...view.commands],
    },
  }
}
