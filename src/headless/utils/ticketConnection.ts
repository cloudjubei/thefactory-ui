import type { GetProviderConnectionResponse, TicketConnectionBinding } from '../api/generated'
import { TICKET_ACCESS_LABELS } from './ticketConnectionConstants'
import type { EffectiveTicketBinding } from './ticketConnectionTypes'

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
  return `${name} · ${TICKET_ACCESS_LABELS[binding.access]} · ${scope}`
}

/** A project's own setting as stored in its metadata: a binding, an opt-out, or nothing (follow its group). */
export function readTicketConnection(value: unknown): TicketConnectionBinding | 'none' | undefined {
  if (value === 'none') return 'none'
  const binding = value as Partial<TicketConnectionBinding> | null | undefined
  return typeof binding?.connectionId === 'string' && typeof binding.access === 'string'
    ? (binding as TicketConnectionBinding)
    : undefined
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
