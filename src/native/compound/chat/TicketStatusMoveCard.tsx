import { Text, View } from 'react-native'
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
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { TicketKeyLink } from '../chips/TicketCard'
import TicketStatusLozenge from '../chips/TicketStatusLozenge'

export type TicketStatusMoveCardProps = {
  view: TicketStatusMoveView
  /** The statuses as two lozenges and an arrow, or as one line of text. */
  layout?: TicketStatusMoveLayout
}

/**
 * Native peer of [web's `TicketStatusMoveCard`](../../../web/compound/chat/TicketStatusMoveCard.tsx):
 * a Jira ticket's status move, on its tool row and on its ask: Jira's mark, the
 * key as a link, the title, the statuses it moves between, the comment sent with
 * it and how it ended. A move that failed or was refused shows why and no statuses.
 */
export default function TicketStatusMoveCard({
  view,
  layout = TICKET_STATUS_MOVE_DEFAULT_LAYOUT,
}: TicketStatusMoveCardProps) {
  const { theme, status } = useNativeTheme()
  const noteColor =
    view.outcome === 'moved'
      ? status.done.softFg
      : view.outcome === 'failed'
        ? status.stuck.softFg
        : theme.text.secondary
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <TicketKeyLink ticketKey={view.key} url={view.url} />
        <View style={{ flex: 1 }} />
        <Text style={{ fontSize: 12, fontWeight: '500', color: noteColor }}>{view.note}</Text>
      </View>
      {view.title ? (
        <Text numberOfLines={2} style={{ fontSize: 13, color: theme.text.primary }}>
          {view.title}
        </Text>
      ) : null}
      {view.to && layout === 'line' ? (
        <Text style={{ fontSize: 13, fontWeight: '500', color: theme.text.primary }}>
          {view.line}
        </Text>
      ) : view.to ? (
        <View
          accessible
          accessibilityLabel={view.line}
          style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}
        >
          {view.from ? <TicketStatusLozenge view={view.from} /> : null}
          <Text style={{ fontSize: 13, color: theme.text.muted }}>
            {TICKET_STATUS_MOVE_TEXT.arrow}
          </Text>
          <TicketStatusLozenge view={view.to} />
        </View>
      ) : null}
      {view.comment ? (
        <View style={{ gap: 2 }}>
          <Text
            style={{
              fontSize: 10,
              fontWeight: '600',
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              color: theme.text.muted,
            }}
          >
            {TICKET_STATUS_MOVE_TEXT.comment}
          </Text>
          <Text numberOfLines={4} style={{ fontSize: 13, color: theme.text.secondary }}>
            {view.comment}
          </Text>
        </View>
      ) : null}
      {view.error ? (
        <Text selectable style={{ fontSize: 13, color: status.stuck.softFg }}>
          {view.error}
        </Text>
      ) : null}
    </View>
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
