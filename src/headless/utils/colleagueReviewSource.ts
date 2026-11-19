import {
  DEFAULT_BACKEND_ORIGIN,
  REVIEW_OFFER_TEXT,
  SLACK_OAUTH_CALLBACK_PATH,
  SLACK_PROVIDER,
  SLACK_SETTINGS_TEXT as TEXT,
} from './colleagueReviewSourceConstants'
import type {
  ReviewOfferRowView,
  ReviewSettingsChange,
  ReviewSettingsView,
  ReviewSourcePending,
  ReviewSourcePoll,
  ReviewSourceSettings,
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

const NO_SETTINGS: ReviewSourceSettings = { skipTicketStatuses: [] }

/** The ticket status names typed comma-separated: trimmed, empty ones left out, the first of any that differ only in case or spaces kept. Pure. */
export function parseTicketStatuses(text: string): string[] {
  const seen = new Set<string>()
  const names: string[] = []
  for (const part of text.split(',')) {
    const name = part.trim()
    const key = name.toLowerCase().replace(/\s+/g, ' ')
    if (name === '' || seen.has(key)) continue
    seen.add(key)
    names.push(name)
  }
  return names
}

/** The ticket status names as the field shows them: "Done, Won’t do". Pure. */
export function ticketStatusesText(statuses: readonly string[]): string {
  return statuses.join(', ')
}

/** The emoji name typed for the start reaction, spaces and colons around it left out: ":eyes:" is "eyes". Pure. */
export function startReactionName(text: string): string {
  return text.trim().replace(/^:+|:+$/g, '')
}

/** The group's review settings with the person's changes on their way laid over them, in order. Pure. */
export function reviewSettingsShown(
  settings: ReviewSourceSettings | undefined,
  changes: readonly ReviewSettingsChange[],
): ReviewSourceSettings {
  const base = settings ?? NO_SETTINGS
  if (changes.length === 0) return base
  return changes.reduce<ReviewSourceSettings>((shown, change) => {
    const { startReaction, mergedTicketStatus, ...rest } = { ...shown, ...change }
    return {
      ...rest,
      ...(startReaction ? { startReaction } : {}),
      ...(mergedTicketStatus ? { mergedTicketStatus } : {}),
    }
  }, base)
}

function sameNames(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((name, at) => name === b[at])
}

/** The change would alter the group's review settings: anything else need not be sent. Pure. */
export function reviewSettingsChangeNeeded(
  settings: ReviewSourceSettings | undefined,
  change: ReviewSettingsChange,
): boolean {
  const held = settings ?? NO_SETTINGS
  return (
    (change.skipTicketStatuses !== undefined &&
      !sameNames(held.skipTicketStatuses, change.skipTicketStatuses)) ||
    (change.startReaction !== undefined && change.startReaction !== (held.startReaction ?? '')) ||
    (change.runChecksUnasked !== undefined &&
      change.runChecksUnasked !== (held.runChecksUnasked ?? false)) ||
    (change.defaultMode !== undefined && change.defaultMode !== (held.defaultMode ?? 'inline')) ||
    (change.mergedTicketStatus !== undefined &&
      (change.mergedTicketStatus ?? '') !== (held.mergedTicketStatus ?? ''))
  )
}

/** The group's review settings as Settings shows them; `undefined` until the first read. Pure. */
export function reviewSettingsView(
  status: ReviewSourceStatus | undefined,
): ReviewSettingsView | undefined {
  if (!status) return undefined
  const { settings } = status
  const reactionError = status.lastPoll?.reactionError
  return {
    skipStatuses: ticketStatusesText(settings.skipTicketStatuses),
    startReaction: settings.startReaction ?? '',
    runChecksUnasked: settings.runChecksUnasked ?? false,
    defaultMode: settings.defaultMode ?? 'inline',
    mergedTicketStatus: settings.mergedTicketStatus ?? '',
    ...(reactionError ? { reactionError: TEXT.reactionError(reactionError) } : {}),
  }
}

/**
 * The watched thread as views draw it: a thread being watched shows at once,
 * a cleared one goes at once, the person's settings changes show at once,
 * and the updates the person settled leave the waiting count. Pure.
 */
export function reviewSourceShown(
  status: ReviewSourceStatus | undefined,
  pending: ReviewSourcePending | undefined,
  settledOffers: number,
  settingChanges: readonly ReviewSettingsChange[] = [],
): ReviewSourceStatus | undefined {
  if (!status) return undefined
  if (!pending && settledOffers === 0 && settingChanges.length === 0) return status
  const offers =
    settledOffers > 0
      ? { ...status.offers, new: Math.max(0, status.offers.new - settledOffers) }
      : status.offers
  const settings =
    settingChanges.length > 0
      ? reviewSettingsShown(status.settings, settingChanges)
      : status.settings
  const { source, connection, lastPoll: _read, ...rest } = status
  if (pending?.kind === 'clear') return { ...rest, offers, settings }
  if (pending?.kind === 'watch') {
    const { connectionId, permalink } = pending
    return {
      ...rest,
      offers,
      settings,
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
  return { ...status, offers, settings }
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
  const settings = reviewSettingsView(status)
  return {
    connection,
    redirectUrl: slackOAuthRedirectUrl(apiBaseUrl),
    thread: reviewThreadView(source, now),
    canWatch: connection.kind !== 'not-connected',
    ...(settings ? { settings } : {}),
    ...(source.readError ? { readError: source.readError } : {}),
    ...(source.actionError ? { actionError: source.actionError } : {}),
    loading: source.status === undefined && source.readError === undefined,
  }
}

/** A ticket's latest update as its row shows it: who, how many files, whether it was put aside, and when. Pure. */
export function reviewOfferRowView(offer: TicketReviewOffer, now: number): ReviewOfferRowView {
  const permalink = slackMessageLink(offer.permalink)
  const dismissed = offer.state === 'dismissed'
  const who =
    offer.kind === 'next-round'
      ? REVIEW_OFFER_TEXT.nextUpdate(offer.author)
      : REVIEW_OFFER_TEXT.update(offer.author)
  const label = [
    who,
    ...(offer.files > 0 ? [REVIEW_OFFER_TEXT.files(offer.files)] : []),
    ...(dismissed ? [REVIEW_OFFER_TEXT.dismissedTag] : []),
  ].join(' · ')
  return {
    id: offer.id,
    kind: offer.kind,
    author: offer.author,
    label,
    when: timeAgo(now, Date.parse(offer.postedAt)),
    ...(permalink ? { permalink } : {}),
    dismissed,
  }
}

/** Who sent the update the paste box starts from, and when. Pure. */
export function reviewBoxOfferLine(
  offer: { author: string; postedAt: string },
  now: number,
): string {
  return REVIEW_OFFER_TEXT.fromSlack(offer.author, timeAgo(now, Date.parse(offer.postedAt)))
}
