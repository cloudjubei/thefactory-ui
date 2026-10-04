import type { GetProviderConnectionResponse, TicketConnectionBinding } from '../api/generated'
import { TICKET_ACCESS_LABELS } from './ticketConnectionConstants'

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
