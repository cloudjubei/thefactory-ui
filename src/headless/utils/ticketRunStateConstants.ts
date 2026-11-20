import type { TicketRunIndex, TicketRunKind, TicketRunLayout } from './ticketRunStateTypes'

/** What each kind of run working a ticket is called on its row. */
export const TICKET_RUN_NAMES: Readonly<Record<TicketRunKind, string>> = {
  review: 'Review run',
  group: 'Group run',
  story: 'Story run',
}

/** What a ticket's run says of itself. */
export const TICKET_RUN_TEXT = {
  line: (name: string, state: string) => `${name} · ${state}`,
  waitingForYou: 'Waiting for you',
  waitingForYouAt: (what: string) => `Waiting for you: ${what}`,
  waitingFor: (what: string) => `Waiting for ${what}`,
  failedAt: (step: string) => `Failed at ${step}`,
  openRun: 'Open run',
  openRunHint: (label: string) => `Open the run — ${label}`,
} as const

/** No runs read yet: every ticket shows none. */
export const NO_TICKET_RUNS: TicketRunIndex = {
  reviews: new Map(),
  stories: new Map(),
  groupRuns: new Map(),
}

export const TICKET_RUN_LAYOUTS: readonly TicketRunLayout[] = ['line', 'chip', 'dot']

/** The layout that ships. */
export const TICKET_RUN_DEFAULT_LAYOUT: TicketRunLayout = 'line'

export const TICKET_RUN_LAYOUT_LABELS: Record<TicketRunLayout, string> = {
  line: 'A line under the row',
  chip: 'A chip on the row',
  dot: 'A dot and words',
}
