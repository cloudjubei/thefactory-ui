import {
  TICKET_CHIP_DEFAULT_LAYOUT,
  type TicketChipLayout,
  type TicketChipView,
} from '../../../headless'
import { IconJira } from '../../icons'
import { GroupStoryToneBadge } from '../groupStories/GroupStoryBits'

export type TicketChipProps = {
  view: TicketChipView
  layout?: TicketChipLayout
}

/**
 * A ticket as a chip: Jira's mark, its key and status, opening it in Jira in a new tab. It
 * sits on rows that open on a press, so its own press stops with it. With no
 * status known it says the key; with no web link it opens nothing.
 */
export default function TicketChip({ view, layout = TICKET_CHIP_DEFAULT_LAYOUT }: TicketChipProps) {
  const pill = layout === 'split' ? view.status : undefined
  const words = pill ? view.key : view.label
  const chip = view.url ? (
    <a
      href={view.url}
      target="_blank"
      rel="noreferrer noopener"
      title={view.hint}
      aria-label={`${view.label}. ${view.hint}`}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      className="chip chip--ok min-w-0 max-w-full no-underline"
    >
      <IconJira className="h-3 w-3 shrink-0 text-(--color-blue-500)" />
      <span className="min-w-0 truncate">{words}</span>
    </a>
  ) : (
    <span title={view.hint} className="chip min-w-0 max-w-full">
      <IconJira className="h-3 w-3 shrink-0 text-(--color-blue-500)" />
      <span className="min-w-0 truncate">{words}</span>
    </span>
  )
  if (!pill) return chip
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
      {chip}
      <GroupStoryToneBadge tone="queued">{pill}</GroupStoryToneBadge>
    </span>
  )
}
