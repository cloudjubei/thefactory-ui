import { signOffOutputSegments } from './groupSignOff'
import { TICKET_UPDATE_COPY } from './ticketUpdateConstants'
import type {
  TicketUpdateCardView,
  TicketUpdateChannel,
  TicketUpdatePhase,
  TicketUpdateState,
} from './ticketUpdateTypes'

const isWebLink = (url: string): boolean => /^https?:\/\//i.test(url)

function placeOf(channel: TicketUpdateChannel | undefined): string | undefined {
  if (!channel) return undefined
  if (channel.name) return TICKET_UPDATE_COPY.channel(channel.name)
  return channel.kind === 'thread'
    ? TICKET_UPDATE_COPY.watchedThread
    : TICKET_UPDATE_COPY.watchedChannel
}

/**
 * The ticket update card a sign-off shows: the post word for word, where it
 * goes, what holds it back, and — once pressed — on its way at once, then
 * where it went. Nothing until the update is read, or while it is not
 * offered. Pure.
 */
export function ticketUpdateCard(state: TicketUpdateState): TicketUpdateCardView | undefined {
  const { data } = state
  if (!data?.offered) return undefined
  const place = placeOf(data.channel)
  const phase: TicketUpdatePhase = data.posted
    ? 'posted'
    : state.posting
      ? 'posting'
      : data.problems.length > 0
        ? 'blocked'
        : 'ready'
  const channel = data.channel
  const posted = data.posted
  const named = place ?? TICKET_UPDATE_COPY.watchedChannel
  return {
    phase,
    title: TICKET_UPDATE_COPY.title,
    label: data.label ?? TICKET_UPDATE_COPY.title,
    ...(data.text !== undefined ? { text: data.text } : {}),
    segments: signOffOutputSegments(data.text ?? ''),
    where: place ? TICKET_UPDATE_COPY.to(place) : TICKET_UPDATE_COPY.nowhere,
    ...(channel && isWebLink(channel.permalink)
      ? {
          channelLink: {
            label:
              channel.kind === 'thread'
                ? TICKET_UPDATE_COPY.openThread
                : TICKET_UPDATE_COPY.openChannel,
            url: channel.permalink,
          },
        }
      : {}),
    problems: data.problems,
    canPost: phase === 'ready',
    button: phase === 'posting' ? TICKET_UPDATE_COPY.posting : TICKET_UPDATE_COPY.post,
    ...(posted ? { postedLine: TICKET_UPDATE_COPY.posted(named) } : {}),
    ...(posted && isWebLink(posted.permalink)
      ? { postedLink: { label: TICKET_UPDATE_COPY.openPost, url: posted.permalink } }
      : {}),
    ...(state.error ? { error: state.error } : {}),
    confirm: {
      title: TICKET_UPDATE_COPY.confirmTitle(named),
      body: TICKET_UPDATE_COPY.confirmBody,
      confirm: TICKET_UPDATE_COPY.confirm,
      cancel: TICKET_UPDATE_COPY.cancel,
    },
  }
}
