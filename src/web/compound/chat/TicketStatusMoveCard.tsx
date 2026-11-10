import { jiraIssueKeyProject } from 'thefactory-tools/utils'
import {
  TICKET_STATUS_MOVE_DEFAULT_LAYOUT,
  TICKET_STATUS_MOVE_TEXT,
  ticketStatusMoveView,
  useTicketLinks,
  useTicketPreview,
  type TicketStatusMoveLayout,
  type TicketStatusMoveView,
} from '../../../headless'
import { TicketKeyLink } from '../chips/TicketCard'
import TicketStatusLozenge from '../chips/TicketStatusLozenge'

const NOTE_TONE: Record<TicketStatusMoveView['outcome'], string> = {
  asking: 'text-(--text-secondary)',
  moving: 'text-(--text-secondary)',
  moved: 'text-(--status-done-soft-fg)',
  failed: 'text-(--status-stuck-soft-fg)',
  declined: 'text-(--text-secondary)',
  cancelled: 'text-(--text-secondary)',
}

export type TicketStatusMoveCardProps = {
  view: TicketStatusMoveView
  /** The statuses as two lozenges and an arrow, or as one line of text. */
  layout?: TicketStatusMoveLayout
}

/**
 * A Jira ticket's status move, on its tool row and on its ask: Jira's mark, the
 * key as a link, the title, the statuses it moves between, the comment sent
 * with it and how it ended. A move that failed or was refused shows why and no
 * statuses. Its text comes from Jira and the agent and stays plain text.
 */
export default function TicketStatusMoveCard({
  view,
  layout = TICKET_STATUS_MOVE_DEFAULT_LAYOUT,
}: TicketStatusMoveCardProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2 text-[12.5px]">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
        <TicketKeyLink ticketKey={view.key} url={view.url} />
        {view.title ? (
          <span
            className="line-clamp-2 min-w-0 flex-1 basis-40 break-words text-(--text-primary)"
            title={view.title}
          >
            {view.title}
          </span>
        ) : (
          <span className="flex-1" />
        )}
        <span className={`shrink-0 text-[11.5px] font-medium ${NOTE_TONE[view.outcome]}`}>
          {view.note}
        </span>
      </div>
      {view.to && layout === 'line' ? (
        <span className="break-words font-medium text-(--text-primary)">{view.line}</span>
      ) : view.to ? (
        <div className="flex min-w-0 flex-wrap items-center gap-1.5" aria-label={view.line}>
          {view.from ? <TicketStatusLozenge view={view.from} /> : null}
          <span aria-hidden className="text-(--text-muted)">
            {TICKET_STATUS_MOVE_TEXT.arrow}
          </span>
          <TicketStatusLozenge view={view.to} />
        </div>
      ) : null}
      {view.comment ? (
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[10px] font-semibold tracking-wider text-(--text-muted) uppercase">
            {TICKET_STATUS_MOVE_TEXT.comment}
          </span>
          <span className="line-clamp-4 whitespace-pre-wrap break-words text-(--text-secondary)">
            {view.comment}
          </span>
        </div>
      ) : null}
      {view.error ? (
        <span className="break-words text-(--status-stuck-soft-fg)">{view.error}</span>
      ) : null}
    </div>
  )
}

export type TicketStatusMoveConnectedProps = {
  /** The call's arguments. */
  args?: unknown
  result?: unknown
  resultType?: string
  layout?: TicketStatusMoveLayout
}

/**
 * {@link TicketStatusMoveCard} for a call in a chat. While the move waits on
 * the person nothing has moved, so it reads the ticket's preview through the
 * chat's own Jira binding for the title and where the ticket stands now; the
 * ask never waits on that read. A finished move shows what Jira answered.
 */
export function TicketStatusMoveConnected({
  args,
  result,
  resultType,
  layout,
}: TicketStatusMoveConnectedProps) {
  const links = useTicketLinks()
  const call = { args, result, ...(resultType !== undefined ? { resultType } : {}) }
  const bare = ticketStatusMoveView(call)
  const waiting = bare.outcome === 'asking' || bare.outcome === 'moving'
  const readable = waiting && jiraIssueKeyProject(bare.key) !== undefined
  const state = useTicketPreview(readable ? bare.key : undefined, readable)
  const view = ticketStatusMoveView({
    ...call,
    ...(state.kind === 'ready' ? { preview: state.preview } : {}),
    ...(links ? { siteUrl: links.site.baseUrl } : {}),
  })
  return <TicketStatusMoveCard view={view} {...(layout ? { layout } : {})} />
}
