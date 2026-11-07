import { resolveProjectCapabilitySettings } from 'thefactory-tools/validations'

import type { GetProviderConnectionResponse, TicketConnectionBinding } from '../api/generated'
import {
  GITHUB_STATE_LABELS,
  TICKET_ACCESS_COPY,
  TICKET_ACCESS_LABELS,
  TICKET_BINDABLE_PROVIDERS,
  TICKET_PICKER_INHERIT,
  TICKET_PICKER_NONE,
  TICKET_TRANSITION_FIELD,
  TICKET_TRANSITION_LABEL,
  TICKET_TRANSITION_LEAVE,
  TICKET_TRANSITION_STANDING,
} from './ticketConnectionConstants'
import type {
  EffectiveTicketBinding,
  TicketTransitionChoice,
  TicketTransitionStanding,
} from './ticketConnectionTypes'

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

/** The stored connections a binding can use. */
export function ticketConnectionsOf<C extends Pick<GetProviderConnectionResponse, 'provider'>>(
  connections: readonly C[],
): C[] {
  return connections.filter((connection) => TICKET_BINDABLE_PROVIDERS.includes(connection.provider))
}

/** Whether a provider's tickets sit in projects a binding can name. */
export function hasTicketProjects(provider: string | undefined): boolean {
  return provider !== 'github'
}

/** What the access choice says for a provider. */
export function ticketAccessCopy(provider: string | undefined) {
  return provider === 'github' ? TICKET_ACCESS_COPY.github : TICKET_ACCESS_COPY.jira
}

/** One line saying what a binding grants: connection · access · Jira projects · where sign-off moves it. */
export function describeTicketBinding(
  binding: TicketConnectionBinding,
  connections: readonly Pick<GetProviderConnectionResponse, 'id' | 'name' | 'provider'>[],
): string {
  const connection = connections.find(({ id }) => id === binding.connectionId)
  const scope = binding.projectKeys?.length
    ? formatJiraProjectKeys(binding.projectKeys)
    : 'all Jira projects'
  return [
    connection?.name ?? 'A deleted connection',
    TICKET_ACCESS_LABELS[binding.access],
    ...(hasTicketProjects(connection?.provider) ? [scope] : []),
    ...(binding.signOffTransition ? [TICKET_TRANSITION_LABEL(binding.signOffTransition)] : []),
  ].join(' · ')
}

/**
 * The rows of the transition list: leave it alone, each status, and a saved value
 * the list does not hold, which stays shown rather than being lost. With no list
 * yet, `statuses` is `undefined` and nothing can be said of the saved value.
 */
export function ticketTransitionChoices(
  statuses: readonly string[] | undefined,
  saved: string,
  provider?: string,
): TicketTransitionChoice[] {
  const value = saved.trim()
  const named = (status: string) =>
    (provider === 'github' ? GITHUB_STATE_LABELS[status] : undefined) ?? status
  const held = statuses?.some((status) => sameStatus(status, value)) ?? false
  const label = statuses ? TICKET_TRANSITION_FIELD.saved(value) : named(value)
  return [
    { value: TICKET_TRANSITION_LEAVE, label: TICKET_TRANSITION_FIELD.leave },
    ...(statuses ?? []).map((status) => ({ value: status, label: named(status) })),
    ...(value && !held ? [{ value, label }] : []),
  ]
}

const sameStatus = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

/** The row a saved value sits on: a sign-off matches a status in any case, so the list does too. */
export function ticketTransitionChoiceOf(
  choices: readonly TicketTransitionChoice[],
  saved: string,
): string {
  const value = saved.trim()
  if (!value) return TICKET_TRANSITION_LEAVE
  return choices.find((choice) => sameStatus(choice.value, value))?.value ?? value
}

/** What picking a row saves. */
export function ticketTransitionOfChoice(choice: string): string {
  return choice === TICKET_TRANSITION_LEAVE ? '' : choice
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
  if (connection.provider === 'jira') {
    if (binding.projectKeys?.length) return TICKET_TRANSITION_STANDING.projectLimit
    if (connection.tokenSource !== 'oauth' && connection.config?.jiraApiTokenMode !== 'scoped') {
      return TICKET_TRANSITION_STANDING.classicToken
    }
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
 * What picking `chosen` in the connection picker sets, or `undefined` when it is no
 * choice: an empty value, or one naming no connection — Radix's hidden native
 * select reports a value change as `''` when the picked option is not there yet.
 */
export function chooseTicketConnection(
  chosen: string,
  current: TicketConnectionBinding | 'none' | undefined,
  options: {
    inherits: boolean
    connections: readonly Pick<GetProviderConnectionResponse, 'id' | 'provider'>[]
  },
): { value: TicketConnectionBinding | 'none' | undefined } | undefined {
  if (chosen === TICKET_PICKER_INHERIT) return options.inherits ? { value: undefined } : undefined
  if (chosen === TICKET_PICKER_NONE) return { value: options.inherits ? 'none' : undefined }
  const own = current !== undefined && current !== 'none' ? current : undefined
  if (own?.connectionId === chosen) return { value: own }
  const connection = options.connections.find(({ id }) => id === chosen)
  if (!connection) return undefined
  const keepsKeys = own?.projectKeys?.length && hasTicketProjects(connection.provider)
  return {
    value: {
      connectionId: chosen,
      access: own?.access ?? 'read',
      ...(keepsKeys ? { projectKeys: own.projectKeys } : {}),
    },
  }
}

/**
 * The connection a project's agents get — the same rule the backend resolves: the
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

/** One line for a project in its group's list: where its connection comes from, and what it grants. */
export function describeEffectiveTicketBinding(
  effective: EffectiveTicketBinding,
  connections: readonly Pick<GetProviderConnectionResponse, 'id' | 'name' | 'provider'>[],
): string {
  switch (effective.source) {
    case 'group':
      return `Same as ${effective.groupTitle} — ${describeTicketBinding(effective.binding, connections)}`
    case 'project':
      return `Its own — ${describeTicketBinding(effective.binding, connections)}`
    case 'off':
      return 'Tickets turned off here'
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
