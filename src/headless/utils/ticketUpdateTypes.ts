import type { SignOffTextSegment } from './groupSignOffTypes'
import type { ProcessDeliveryLink } from './processDeliveryTypes'

/** Where a ticket update goes: the group's watched channel, or the thread it watches. */
export interface TicketUpdateChannel {
  kind: 'channel' | 'thread'
  /** The channel's name, once Slack named it. */
  name?: string
  permalink: string
}

/** A ticket update once it was posted. */
export interface TicketUpdatePosted {
  channel: string
  ts: string
  permalink: string
  postedAt: string
}

/** The ticket update a sign-off offers, as `GET …/ticket-update` answers it. */
export interface TicketUpdateData {
  /** The sign-off shows it: offered now, or posted already. */
  offered: boolean
  /** The shared output's label, e.g. "Slack Message". */
  label?: string
  /** The post, word for word, as it goes out. */
  text?: string
  channel?: TicketUpdateChannel
  /** Why it cannot be posted now; empty when it can, or once it was. */
  problems: string[]
  posted?: TicketUpdatePosted
}

/** One work's ticket update, as `TicketUpdateStore` keeps it. */
export interface TicketUpdateState {
  data: TicketUpdateData | undefined
  readError: string | null
  /** The post is on its way. */
  posting: boolean
  /** Why the last post failed. */
  error: string | null
}

/** Where the card stands: ready to post, held back, on its way, or posted. */
export type TicketUpdatePhase = 'ready' | 'blocked' | 'posting' | 'posted'

/** The ticket update card on a sign-off. */
export interface TicketUpdateCardView {
  phase: TicketUpdatePhase
  title: string
  label: string
  /** The post, word for word; absent until it is written. */
  text?: string
  /** The post split so each placeholder left stands out. */
  segments: SignOffTextSegment[]
  /** Where it goes, in a line. */
  where: string
  channelLink?: ProcessDeliveryLink
  problems: string[]
  canPost: boolean
  button: string
  postedLine?: string
  postedLink?: ProcessDeliveryLink
  error?: string
  confirm: { title: string; body: string; confirm: string; cancel: string }
}
