import { projectChecksSummaryLines } from 'thefactory-tools/utils'

import type { ApproachAvailability, CheckEcosystem } from '../api/generated'
import {
  CAPABILITY_ASK_DELIVERABLE,
  CAPABILITY_ASK_IN_RUN,
  CAPABILITY_ASK_OUTSIDE_RUN,
  CAPABILITY_CAPTURE_APPROACH,
  CAPABILITY_CAPTURE_NOT_SCANNED,
  CAPABILITY_COMMON_OPTIONS,
  CAPABILITY_DETECTED_FROM,
  CAPABILITY_DETECTED_FROM_GENERIC,
  CAPABILITY_KINDS,
  CAPABILITY_NAMES,
  CAPABILITY_UI_TESTS_NOT_SCANNED,
  CAPABILITY_UNKNOWN_PLATFORM,
} from './capabilityChatDraftConstants'
import type {
  CapabilityDraftContext,
  CapabilityDraftTarget,
  CapabilityMethodId,
} from './capabilityChatDraftTypes'
import type { CheckMethodId, CheckMethodRow } from './checkMethodTypes'

/** Whether a method is something a project can be set up to provide. */
export function isCapabilityMethod(id: CheckMethodId): id is CapabilityMethodId {
  return id in CAPABILITY_KINDS
}

/**
 * Whether a chip is a missing capability the agent can set up: not configured,
 * asking for a set-up, and a capability at all — never a withheld capture,
 * which only the user can allow.
 */
export function capabilitySetupOffered<T extends Pick<CheckMethodRow, 'id' | 'state' | 'action'>>(
  row: T,
): row is T & { id: CapabilityMethodId } {
  return (
    row.state === 'unconfigured' &&
    row.action.kind === 'request' &&
    row.action.purpose === 'setup' &&
    isCapabilityMethod(row.id)
  )
}

function availabilityLine(label: string, availability: ApproachAvailability): string {
  switch (availability.status) {
    case 'available':
      return `- ${label}: available on this host.`
    case 'unavailable': {
      const missing = availability.missing
        .map((id, i) => (availability.hints[i] ? `${id} (${availability.hints[i]})` : id))
        .join(', ')
      const withheld = availability.withheld ? ` ${availability.withheld}` : ''
      return `- ${label}: unavailable — missing ${missing}.${withheld}`
    }
    case 'not-allowed':
      return `- ${label}: not allowed — ${availability.reason}`
    case 'unservable':
      return `- ${label}: cannot be served — ${availability.reason}`
    case 'not-applicable':
      return `- ${label}: not applicable — ${availability.reason}`
  }
}

function captureLines(id: CapabilityMethodId, context: CapabilityDraftContext): string[] {
  const platform = context.platform
  const approachId = CAPABILITY_CAPTURE_APPROACH[id]
  const approach = context.approaches?.find((a) => a.spec.id === approachId)
  if (!platform && !approach) return []
  return [
    'Capture on this project:',
    ...(platform ? [`- Platform: ${platform}`] : []),
    ...(platform === 'unknown' ? [`- ${CAPABILITY_UNKNOWN_PLATFORM}`] : []),
    ...(approach ? [availabilityLine(approach.spec.label, approach.availability)] : []),
  ]
}

function detectionLine(id: CapabilityMethodId, ecosystem: CheckEcosystem | undefined): string {
  const kind = CAPABILITY_KINDS[id]
  if (kind === 'ui-tests') return CAPABILITY_UI_TESTS_NOT_SCANNED
  if (kind === 'capture') return CAPABILITY_CAPTURE_NOT_SCANNED
  const from =
    (ecosystem && CAPABILITY_DETECTED_FROM[ecosystem]?.[id]) ?? CAPABILITY_DETECTED_FROM_GENERIC
  return `The checks scan picks it up from ${from}.`
}

/**
 * The chat draft that asks an agent to set a missing capability up — built
 * from what is known: the capability, the project's checks scan, its platform
 * and what this host can capture. It names common tools only as suggestions,
 * and asks for a proposal (acceptance criteria, the command or set-up, a proof
 * plan) rather than the work itself. Pure.
 */
export function capabilityChatDraft(
  capability: CapabilityDraftTarget,
  context: CapabilityDraftContext,
): string {
  const id = capability.id
  const kind = CAPABILITY_KINDS[id]
  const scan = context.projectChecks
  const ecosystem = scan?.ecosystem
  const options = ecosystem ? CAPABILITY_COMMON_OPTIONS[ecosystem]?.[id] : undefined
  const ask = context.inRun ? CAPABILITY_ASK_IN_RUN : CAPABILITY_ASK_OUTSIDE_RUN
  const sections: string[][] = [
    [`**Set up ${CAPABILITY_NAMES[id]} for this project.**`, `Now: ${capability.detail.trim()}`],
    scan ? ['What the checks scan found:', ...projectChecksSummaryLines(scan)] : [],
    kind === 'capture' || kind === 'ui-tests' ? captureLines(id, context) : [],
    options
      ? [
          `Common options for ${ecosystem}: ${options} — suggestions only; use what fits the project.`,
        ]
      : [],
    [detectionLine(id, ecosystem)],
    [`${ask} with acceptance criteria, ${CAPABILITY_ASK_DELIVERABLE[kind]}, and a proof plan.`],
  ]
  return `${sections
    .filter((lines) => lines.length > 0)
    .map((lines) => lines.join('\n'))
    .join('\n\n')}\n`
}

/**
 * A chip's set-up handler: opens the chat with the capability's draft when the
 * chip is a missing capability, does nothing for any other chip. `undefined`
 * when there is no chat to open, so the surface offers no button. Pure.
 */
export function capabilitySetupHandler(
  open: ((draft: string) => void) | undefined,
  context: CapabilityDraftContext,
):
  | ((row: Pick<CheckMethodRow, 'id' | 'state' | 'action' | 'label' | 'detail'>) => void)
  | undefined {
  if (!open) return undefined
  return (row) => {
    if (capabilitySetupOffered(row)) open(capabilityChatDraft(row, context))
  }
}
