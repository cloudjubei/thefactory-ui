import type { TicketConnectionBinding } from '../api/generated'

/**
 * Which Jira a project's agents actually get: the project's own binding, its
 * main group's, none because the project opted out, or none at all.
 */
export type EffectiveTicketBinding =
  | { source: 'project'; binding: TicketConnectionBinding }
  | { source: 'group'; binding: TicketConnectionBinding; groupTitle: string }
  | { source: 'off' }
  | { source: 'none' }

/** What a sign-off would do with a binding, for the transition setting. */
export type TicketTransitionStanding = {
  label: string
  tone: 'empty' | 'onhold' | 'done'
  text: string
}

/** The statuses a sign-off can move a ticket to, as far as the backend could tell. */
export type TicketStatusList =
  | { kind: 'reading' }
  | { kind: 'ready'; statuses: readonly string[] }
  | { kind: 'failed'; reason: string }

/** One row of the transition setting's list. */
export type TicketTransitionChoice = { value: string; label: string }

/** How the transition setting sits under the Jira picker. */
export type TicketTransitionLayout = 'inline' | 'fold' | 'panel'
