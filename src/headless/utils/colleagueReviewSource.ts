import {
  DEFAULT_BACKEND_ORIGIN,
  REVIEW_OFFER_TEXT,
  SLACK_OAUTH_CALLBACK_PATH,
  SLACK_PROVIDER,
  SLACK_SETTINGS_TEXT as TEXT,
} from './colleagueReviewSourceConstants'
import type {
  ReviewOfferRowView,
  ReviewSourcePending,
  ReviewSourcePoll,
  ReviewSourceSnapshot,
  ReviewSourceStatus,
  ReviewThreadView,
  SlackConnectionEntry,
  SlackConnectionView,
  SlackReviewSettingsInput,
  SlackReviewSettingsView,
  TicketReviewOffer,
} from './colleagueReviewSourceTypes'
import type { ProcessStatusTone } from './processView'
import { timeAgo } from './time'

const SLACK_WATCH_LINK =
  /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.slack\.com\/archives\/[a-z0-9]+(\/p\d{10,}(\?\S*)?|\/?)$/i

const SLACK_CLIENT_ID = /^\d+\.\d+$/

/** Why the text is not a Slack app's client id, or `undefined` when it is. Pure. */
export function slackClientIdProblem(text: string): string | undefined {
  return SLACK_CLIENT_ID.test(text.trim()) ? undefined : TEXT.clientIdProblem
}

/** Where Slack sends a sign-in back to: the callback under the backend the client talks to. Pure. */
export function slackOAuthRedirectUrl(apiBaseUrl: string | null | undefined): string {
  const base = apiBaseUrl?.trim().replace(/\/+$/, '') ?? ''
  const origin = /^https?:\/\/[^/\s]+/i.test(base) ? base : DEFAULT_BACKEND_ORIGIN
  return `${origin}${SLACK_OAUTH_CALLBACK_PATH}`
}

/** A Slack link a view may open: only an https one, as it comes from outside. Pure. */
export function slackMessageLink(url: string | undefined): string | undefined {
  if (!url || !URL.canParse(url)) return undefined
  return new URL(url).protocol === 'https:' ? url : undefined
}

/** Why the text is neither a Slack channel link (watch the channel) nor a message link (watch its thread), or `undefined`. Pure. */
export function slackWatchLinkProblem(text: string): string | undefined {
  return SLACK_WATCH_LINK.test(text.trim()) ? undefined : TEXT.notSlackLink
}

/** The group watches a thread it can read and post to. Pure. */
export function reviewThreadWorks(status: ReviewSourceStatus | undefined): boolean {
  return Boolean(status?.source) && status?.connection?.status === 'connected'
}

/** How many updates wait for the person: the Tickets tab's badge. Pure. */
export function waitingReviewOffers(status: ReviewSourceStatus | undefined): number {
  return status?.offers.new ?? 0
}

/**
 * The watched thread as views draw it: a thread being watched shows at once,
 * a cleared one goes at once, and the updates the person settled leave the
 * waiting count. Pure.
 */
export function reviewSourceShown(
  status: ReviewSourceStatus | undefined,
  pending: ReviewSourcePending | undefined,
  settledOffers: number,
): ReviewSourceStatus | undefined {
  if (!status) return undefined
  if (!pending && settledOffers === 0) return status
  const offers =
    settledOffers > 0
      ? { ...status.offers, new: Math.max(0, status.offers.new - settledOffers) }
      : status.offers
  const { source, connection, lastPoll: _read, ...rest } = status
  if (pending?.kind === 'clear') return { ...rest, offers }
  if (pending?.kind === 'watch') {
    const { connectionId, permalink } = pending
    return {
      ...rest,
      offers,
      source: {
        provider: SLACK_PROVIDER,
        channel: '',
        threadTs: '',
        setAt: source?.setAt ?? '',
        connectionId,
        permalink,
      },
      connection:
        connection?.id === connectionId ? connection : { id: connectionId, status: 'connected' },
    }
  }
  return { ...status, offers }
}

function slackConnections(connections: readonly SlackConnectionEntry[]): SlackConnectionEntry[] {
  return connections
    .filter((c) => c.provider === SLACK_PROVIDER)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0))
}

/**
 * How the person's Slack stands: the connection the watched thread is read
 * through, else their newest Slack connection; Slack refusing it asks for a
 * new sign-in. Pure.
 */
export function slackConnectionView(
  connections: readonly SlackConnectionEntry[],
  status: ReviewSourceStatus | undefined,
  oauthSetup: Readonly<Record<string, boolean>>,
): SlackConnectionView {
  const slack = slackConnections(connections)
  const used = status?.connection
  const chosen = slack.find((c) => c.id === used?.id) ?? slack[0]
  if (!chosen) {
    return {
      kind: 'not-connected',
      canSignIn: Object.hasOwn(oauthSetup, SLACK_PROVIDER) && oauthSetup[SLACK_PROVIDER] === true,
    }
  }
  const own = used?.id === chosen.id ? used : undefined
  const workspace = chosen.config?.teamName ?? own?.teamName ?? chosen.name
  const kind = own?.status === 'sign-in-again' ? 'sign-in-again' : 'connected'
  return { kind, connectionId: chosen.id, workspace }
}

const OFFERING_WHY: Record<Exclude<ReviewSourceStatus['offering'], 'ready'>, string> = {
  'no-ticket-binding': TEXT.noTicketBinding,
}

function threadStanding(status: ReviewSourceStatus): {
  label: string
  tone: ProcessStatusTone
  why?: string
} {
  if (status.connection?.status === 'sign-in-again') {
    return { label: TEXT.signInAgainLabel, tone: 'stuck' }
  }
  if (status.connection?.status !== 'connected') {
    return { label: TEXT.connectionGone, tone: 'stuck', why: TEXT.connectionGoneWhy }
  }
  if (status.offering !== 'ready') {
    return { label: TEXT.notOffering, tone: 'on_hold', why: OFFERING_WHY[status.offering] }
  }
  return { label: TEXT.ready, tone: 'done' }
}

function lastReadLine(
  poll: ReviewSourcePoll | undefined,
  now: number,
): { line: string; error?: string } {
  if (!poll) return { line: TEXT.notReadYet }
  const ago = timeAgo(now, Date.parse(poll.at))
  switch (poll.outcome) {
    case 'read': {
      const parts = [TEXT.readAgo(ago)]
      if (poll.replies) parts.push(TEXT.replies(poll.replies))
      if (poll.offers) parts.push(TEXT.newUpdates(poll.offers))
      return { line: parts.join(' · ') }
    }
    case 'failed':
      return { line: TEXT.failedAgo(ago), ...(poll.error ? { error: poll.error } : {}) }
    case 'sign-in-again':
      return { line: TEXT.signInAgainAgo(ago) }
    case 'connection-missing':
      return { line: TEXT.connectionMissingAgo(ago) }
    case 'not-offering':
      return { line: TEXT.notOfferingAgo(ago) }
    case 'not-recorded':
      return { line: TEXT.notRecordedAgo(ago) }
  }
}

function offersLine(offers: ReviewSourceStatus['offers']): string | undefined {
  const parts = [
    offers.new > 0 ? TEXT.waiting(offers.new) : undefined,
    offers.started > 0 ? TEXT.started(offers.started) : undefined,
    offers.dismissed > 0 ? TEXT.dismissed(offers.dismissed) : undefined,
  ].filter((part): part is string => part !== undefined)
  return parts.length > 0 ? parts.join(' · ') : undefined
}

/** The watched thread as Settings shows it, the person's change on its way included. Pure. */
export function reviewThreadView(source: ReviewSourceSnapshot, now: number): ReviewThreadView {
  const status = reviewSourceShown(source.status, source.pending, 0)
  if (!status?.source) return { kind: 'none' }
  const read = lastReadLine(status.lastPoll, now)
  const offers = offersLine(status.offers)
  return {
    kind: 'watching',
    permalink: slackMessageLink(status.source.permalink) ?? '',
    saving: source.pending !== undefined,
    ...threadStanding(status),
    lastRead: read.line,
    ...(read.error ? { lastReadError: read.error } : {}),
    ...(offers ? { offers } : {}),
  }
}

/** What the group's Slack block in Settings shows. Pure. */
export function slackReviewSettingsView(input: SlackReviewSettingsInput): SlackReviewSettingsView {
  const { connections, oauthSetup, source, apiBaseUrl, now } = input
  const status = reviewSourceShown(source.status, source.pending, 0)
  const connection = slackConnectionView(connections, status, oauthSetup)
  return {
    connection,
    redirectUrl: slackOAuthRedirectUrl(apiBaseUrl),
    thread: reviewThreadView(source, now),
    canWatch: connection.kind !== 'not-connected',
    ...(source.readError ? { readError: source.readError } : {}),
    ...(source.actionError ? { actionError: source.actionError } : {}),
    loading: source.status === undefined && source.readError === undefined,
  }
}

/** A ticket's waiting update as its row shows it. Pure. */
export function reviewOfferRowView(offer: TicketReviewOffer, now: number): ReviewOfferRowView {
  const permalink = slackMessageLink(offer.permalink)
  return {
    id: offer.id,
    kind: offer.kind,
    author: offer.author,
    label:
      offer.kind === 'next-round'
        ? REVIEW_OFFER_TEXT.nextUpdate(offer.author)
        : REVIEW_OFFER_TEXT.update(offer.author),
    when: timeAgo(now, Date.parse(offer.postedAt)),
    ...(permalink ? { permalink } : {}),
  }
}

/** Who sent the update the paste box starts from, and when. Pure. */
export function reviewBoxOfferLine(
  offer: { author: string; postedAt: string },
  now: number,
): string {
  return REVIEW_OFFER_TEXT.fromSlack(offer.author, timeAgo(now, Date.parse(offer.postedAt)))
}
