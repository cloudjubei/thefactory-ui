import { resolveProjectCapabilitySettings } from 'thefactory-tools/validations'

import type { GetProviderConnectionResponse, TicketConnectionBinding } from '../api/generated'
import {
  TICKET_ACCESS_LABELS,
  TICKET_PICKER_INHERIT,
  TICKET_PICKER_NONE,
  TICKET_TRANSITION_LABEL,
  TICKET_TRANSITION_STANDING,
} from './ticketConnectionConstants'
import type { EffectiveTicketBinding, TicketTransitionStanding } from './ticketConnectionTypes'

/** Jira project keys typed as free text ("eng, OPS"), upper-cased and de-duplicated. */
export function parseJiraProjectKeys(text: string): string[] {
  const keys = text
    .split(/[\s,]+/)
    .map((key) => key.trim().toUpperCase())
    .filter(Boolean)
  return Array.from(new Set(keys))
}

/** Jira project keys as the editable text {@link parseJiraProjectKeys} reads back. */
export function formatJiraProjectKeys(keys: readonly string[] | undefined): string {
  return (keys ?? []).join(', ')
}

/** The stored connections a Jira binding can use. */
export function jiraConnectionsOf<C extends Pick<GetProviderConnectionResponse, 'provider'>>(
  connections: readonly C[],
): C[] {
  return connections.filter((connection) => connection.provider === 'jira')
}

/** One line saying what a binding grants: connection · access · Jira projects. */
export function describeTicketBinding(
  binding: TicketConnectionBinding,
  connections: readonly Pick<GetProviderConnectionResponse, 'id' | 'name'>[],
): string {
  const name =
    connections.find((connection) => connection.id === binding.connectionId)?.name ??
    'A deleted connection'
  const scope = binding.projectKeys?.length
    ? formatJiraProjectKeys(binding.projectKeys)
    : 'all Jira projects'
  const line = `${name} · ${TICKET_ACCESS_LABELS[binding.access]} · ${scope}`
  return binding.signOffTransition
    ? `${line} · ${TICKET_TRANSITION_LABEL(binding.signOffTransition)}`
    : line
}

/**
 * A binding with this sign-off transition. Blank drops the key: the backend
 * refuses a blank one, and no key is what "leave the ticket where it is" means.
 */
export function withSignOffTransition(
  binding: TicketConnectionBinding,
  text: string,
): TicketConnectionBinding {
  const { signOffTransition: _previous, ...rest } = binding
  const signOffTransition = text.trim()
  return signOffTransition ? { ...rest, signOffTransition } : rest
}

/**
 * Whether connector write-back is on for a project: its own flag, else its main
 * group's. Anything still unset is off, the same rule the backend resolves.
 */
export function connectorWriteBackOf(
  project: { metadata?: unknown; mainGroupId?: string | null },
  groups: readonly { id: string; type?: string; capabilities?: unknown }[],
): boolean {
  const group = groups.find((g) => g.id === project.mainGroupId && g.type === 'MAIN')
  const own = (project.metadata as { capabilities?: unknown } | undefined)?.capabilities
  return resolveProjectCapabilitySettings(
    own as Parameters<typeof resolveProjectCapabilitySettings>[0],
    group?.capabilities as Parameters<typeof resolveProjectCapabilitySettings>[1],
  ).connectorWriteBack
}

/**
 * What a sign-off would do with this binding, read the way the write policy reads
 * it and in its order, so the reason a person has to act on comes first.
 */
export function ticketTransitionStanding({
  binding,
  connection,
  writeBack,
}: {
  binding: TicketConnectionBinding
  connection?:
    | Pick<GetProviderConnectionResponse, 'provider' | 'tokenSource' | 'config'>
    | undefined
  writeBack: boolean
}): TicketTransitionStanding {
  if (!writeBack) return TICKET_TRANSITION_STANDING.off
  if (!connection) return TICKET_TRANSITION_STANDING.noConnection
  if (binding.projectKeys?.length) return TICKET_TRANSITION_STANDING.projectLimit
  if (connection.tokenSource !== 'oauth' && connection.config?.jiraApiTokenMode !== 'scoped') {
    return TICKET_TRANSITION_STANDING.classicToken
  }
  if (binding.access !== 'read-write') return TICKET_TRANSITION_STANDING.readOnly
  return binding.signOffTransition
    ? TICKET_TRANSITION_STANDING.moves
    : TICKET_TRANSITION_STANDING.commentOnly
}

/** A project's own setting as stored in its metadata: a binding, an opt-out, or nothing (follow its group). */
export function readTicketConnection(value: unknown): TicketConnectionBinding | 'none' | undefined {
  if (value === 'none') return 'none'
  const binding = value as Partial<TicketConnectionBinding> | null | undefined
  return typeof binding?.connectionId === 'string' &&
    binding.connectionId !== '' &&
    typeof binding.access === 'string'
    ? (binding as TicketConnectionBinding)
    : undefined
}

/**
 * What picking `chosen` in the Jira picker sets, or `undefined` when it is no
 * choice: an empty value, or one naming no connection — Radix's hidden native
 * select reports a value change as `''` when the picked option is not there yet.
 */
export function chooseTicketConnection(
  chosen: string,
  current: TicketConnectionBinding | 'none' | undefined,
  options: { inherits: boolean; connectionIds: readonly string[] },
): { value: TicketConnectionBinding | 'none' | undefined } | undefined {
  if (chosen === TICKET_PICKER_INHERIT) return options.inherits ? { value: undefined } : undefined
  if (chosen === TICKET_PICKER_NONE) return { value: options.inherits ? 'none' : undefined }
  const own = current !== undefined && current !== 'none' ? current : undefined
  if (own?.connectionId === chosen) return { value: own }
  if (!options.connectionIds.includes(chosen)) return undefined
  return {
    value: {
      connectionId: chosen,
      access: own?.access ?? 'read',
      ...(own?.projectKeys?.length ? { projectKeys: own.projectKeys } : {}),
    },
  }
}

/**
 * The Jira a project's agents get — the same rule the backend resolves: the
 * project's own choice, else its MAIN group's binding.
 */
export function effectiveTicketBinding(
  project: { metadata?: unknown; mainGroupId?: string | null },
  groups: readonly { id: string; title: string; ticketConnection?: TicketConnectionBinding }[],
): EffectiveTicketBinding {
  const own = readTicketConnection(
    (project.metadata as { ticketConnection?: unknown } | undefined)?.ticketConnection,
  )
  if (own === 'none') return { source: 'off' }
  if (own) return { source: 'project', binding: own }
  const group = groups.find((g) => g.id === project.mainGroupId)
  return group?.ticketConnection
    ? { source: 'group', binding: group.ticketConnection, groupTitle: group.title }
    : { source: 'none' }
}

/** One line for a project in its group's list: where its Jira comes from, and what it grants. */
export function describeEffectiveTicketBinding(
  effective: EffectiveTicketBinding,
  connections: readonly Pick<GetProviderConnectionResponse, 'id' | 'name'>[],
): string {
  switch (effective.source) {
    case 'group':
      return `Same as ${effective.groupTitle} — ${describeTicketBinding(effective.binding, connections)}`
    case 'project':
      return `Its own — ${describeTicketBinding(effective.binding, connections)}`
    case 'off':
      return 'Jira turned off here'
    case 'none':
      return 'Not connected'
  }
}

/**
 * A project's metadata after choosing `value`. Following the group again drops
 * the key outright: a project update replaces its metadata whole, so an absent
 * key is what "inherit" is.
 */
export function withTicketConnection(
  metadata: Record<string, unknown> | undefined,
  value: TicketConnectionBinding | 'none' | undefined,
): Record<string, unknown> {
  const { ticketConnection: _previous, ...rest } = metadata ?? {}
  return value === undefined ? rest : { ...rest, ticketConnection: value }
}
