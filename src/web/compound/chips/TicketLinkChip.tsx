import {
  TICKET_CARD_TEXT,
  useTicketPreview,
  type TicketCardLayout,
  type TicketLink,
} from '../../../headless'
import { IconJira } from '../../icons'
import Tooltip from '../../primitives/Tooltip'
import { TicketPreviewPanel } from './TicketCard'

export type TicketLinkChipProps = {
  link: TicketLink
  /** How the preview card is laid out. */
  layout?: TicketCardLayout
}

function TicketLinkPreview({ link, layout }: TicketLinkChipProps) {
  const state = useTicketPreview(link.key, true)
  return (
    <TicketPreviewPanel
      ticketKey={link.key}
      url={link.url}
      state={state}
      {...(layout ? { layout } : {})}
    />
  )
}

/**
 * A link to a ticket on the chat's Jira site, as a chip: Jira's mark and the
 * key, opening the ticket in a new tab. Resting on it shows the ticket's
 * preview, read the first time it opens and kept for the session; a ticket
 * that could not be read says so and the chip still opens it.
 */
export default function TicketLinkChip({ link, layout }: TicketLinkChipProps) {
  return (
    <Tooltip
      placement="top"
      allowedPlacements={['top', 'bottom']}
      zIndex={2000}
      disableClickToggle
      content={<TicketLinkPreview link={link} {...(layout ? { layout } : {})} />}
    >
      <a
        href={link.url}
        target="_blank"
        rel="noreferrer noopener"
        aria-label={`${link.key}. ${TICKET_CARD_TEXT.open}`}
        onClick={(e) => e.stopPropagation()}
        className="chip chip--ok min-w-0 max-w-full align-baseline no-underline"
      >
        <IconJira className="h-3 w-3 shrink-0 text-(--color-blue-500)" />
        <span className="min-w-0 truncate">{link.key}</span>
      </a>
    </Tooltip>
  )
}
