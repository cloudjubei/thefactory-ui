import {
  REVIEW_REPLY_PREVIEW_CHARS,
  REVIEW_REPLY_PREVIEW_LINES,
  REVIEW_REPLY_TEXT as TEXT,
} from './reviewReplyConstants'
import { slackMessageLink } from './colleagueReviewSource'
import type { ReviewOffer } from './colleagueReviewSourceTypes'
import type { ReviewBoxOffer } from './colleagueReviewStartTypes'
import type { ReviewCommitsView } from './reviewCommitsTypes'
import type { ReviewReplySource, ReviewReplyView } from './reviewReplyTypes'
import { timeAgo } from './time'

function previewOf(text: string): { preview: string; cut: boolean } {
  const lines = text.split('\n')
  const byLines =
    lines.length > REVIEW_REPLY_PREVIEW_LINES
      ? lines.slice(0, REVIEW_REPLY_PREVIEW_LINES).join('\n')
      : text
  if (byLines.length > REVIEW_REPLY_PREVIEW_CHARS) {
    return { preview: `${byLines.slice(0, REVIEW_REPLY_PREVIEW_CHARS).trimEnd()}…`, cut: true }
  }
  return { preview: byLines, cut: byLines !== text }
}

/** The newest reply still waiting to start a ticket's next round, among its updates. Pure. */
export function waitingReviewReply<T extends ReviewReplySource>(
  updates: readonly T[],
): T | undefined {
  return updates
    .filter((u) => u.kind === 'next-round' && u.state === 'new')
    .sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt))[0]
}

/** The line saying who replied, when, and what was pushed since review. Pure. */
export function reviewReplyLine(
  who: string,
  when: string,
  commits: ReviewCommitsView | undefined,
): string {
  return [who, when, ...(commits ? [commits.label] : [])].join(' · ')
}

/**
 * A reply waiting on a ticket under review: who wrote it and when, what they
 * wrote with a preview cut to a few lines, its files, the commits pushed
 * since the last round when known, and the round Start begins — the one after
 * the review's latest. Pure.
 */
export function reviewReplyView(
  reply: ReviewReplySource,
  latestRound: number,
  now: number,
  commits?: ReviewCommitsView,
): ReviewReplyView {
  const who = TEXT.replied(reply.author.trim() || TEXT.someone)
  const when = timeAgo(now, Date.parse(reply.postedAt))
  const round = latestRound + 1
  return {
    offerId: reply.id,
    who,
    when,
    line: reviewReplyLine(who, when, commits),
    text: reply.text,
    ...previewOf(reply.text),
    files: reply.files,
    ...(reply.files > 0 ? { filesLabel: TEXT.files(reply.files) } : {}),
    round,
    startLabel: TEXT.start(round),
    ...(commits ? { commits } : {}),
  }
}

/** A ticket's offers, whatever the case of its key, as the replies its review reads. Pure. */
export function reviewReplySources(
  offers: Readonly<Record<string, ReviewOffer>>,
  ticketKey: string,
): ReviewReplySource[] {
  const key = ticketKey.toUpperCase()
  return Object.values(offers)
    .filter((offer) => offer.ticketKey.toUpperCase() === key)
    .map((offer) => ({
      id: offer.id,
      kind: offer.kind,
      state: offer.state,
      author: offer.author,
      postedAt: offer.postedAt,
      text: offer.text,
      files: offer.attachments.length,
    }))
}

/** The offer a round starts from, as the paste box would carry it: its files named, only an https link kept. Pure. */
export function reviewReplyBoxOffer(offer: ReviewOffer): ReviewBoxOffer {
  const permalink = slackMessageLink(offer.permalink)
  return {
    id: offer.id,
    author: offer.author,
    postedAt: offer.postedAt,
    ...(permalink ? { permalink } : {}),
    files: offer.attachments.map((a) => a.name),
    text: offer.text,
  }
}
