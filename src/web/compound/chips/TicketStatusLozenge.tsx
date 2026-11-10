import { TICKET_STATUS_TONE, type TicketStatusLozengeView } from '../../../headless'

export type TicketStatusLozengeProps = {
  view: TicketStatusLozengeView
}

/**
 * A ticket's status as a lozenge, coloured by its Jira category in the app's
 * own status tones: to-do grey, in progress blue, done green. The one status
 * pill a ticket chip, a ticket's card and a status move share.
 */
export default function TicketStatusLozenge({ view }: TicketStatusLozengeProps) {
  const tone = TICKET_STATUS_TONE[view.tone]
  return (
    <span
      title={view.label}
      className="inline-flex max-w-full min-w-0 shrink-0 items-center rounded-[4px] px-1.5 py-px text-[10.5px] font-semibold tracking-wide uppercase"
      style={{
        background: `var(--status-${tone}-soft-bg)`,
        color: `var(--status-${tone}-soft-fg)`,
        border: `1px solid var(--status-${tone}-soft-border)`,
      }}
    >
      <span className="min-w-0 truncate">{view.label}</span>
    </span>
  )
}
