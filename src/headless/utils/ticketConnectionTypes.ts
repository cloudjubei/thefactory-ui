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
