import { PROCESS_RUN_TERMINAL_STATUSES } from 'thefactory-tools/constants'
import { REVIEW_VERDICT_VIEW } from './colleagueReviewCardConstants'
import { reviewOfChat } from './colleagueReviewStart'
import { slackMessageLink } from './colleagueReviewSource'
import { REVIEW_OFFER_TEXT } from './colleagueReviewSourceConstants'
import {
  GROUP_TICKET_PART_FAILED,
  GROUP_TICKET_PAGE_TEXT as TEXT,
  GROUP_TICKET_PR_CHECKS_VIEW,
  GROUP_TICKET_PR_STATE_VIEW,
  GROUP_TICKET_UPDATE_LINKS_MAX,
  GROUP_TICKET_UPDATE_STATE_VIEW,
} from './groupTicketPageConstants'
import type {
  GroupTicketFact,
  GroupTicketOverview,
  GroupTicketOverviewPart,
  GroupTicketPageView,
  GroupTicketReviewRound,
  GroupTicketRoundView,
  GroupTicketUpdate,
  GroupTicketUpdateView,
  GroupTicketReviewRun,
} from './groupTicketPageTypes'
import type { GroupTicketTab } from './groupTicketTabTypes'
import type { ReviewCommitsView } from './reviewCommitsTypes'
import { reviewReplyView, waitingReviewReply } from './reviewReply'
import { ticketChipView, ticketLink } from './groupTickets'
import { PROCESS_RUN_STATUS_VIEW } from './processView'
import { PROCESS_RUN_CLOSED_AS_VIEW } from './processViewConstants'
import { ticketRunState } from './ticketRunState'
import { NO_TICKET_RUNS } from './ticketRunStateConstants'
import type { TicketRunIndex } from './ticketRunStateTypes'
import type { ReviewMergeJob } from './colleagueReviewMergeTypes'
import { timeAgo } from './time'

/** The runs a page reads the ticket's run from, kept live, and the merges of its review run. */
export interface GroupTicketPageRuns {
  index: TicketRunIndex
  merges: Readonly<Record<string, ReviewMergeJob>>
}

const NO_RUNS: GroupTicketPageRuns = { index: NO_TICKET_RUNS, merges: {} }

const WEB_LINK = /<(https?:\/\/[^|>\s]+)(?:\|[^>]*)?>|(https?:\/\/[^\s<>()]+)/gi
const TRAILING = /[.,;:!?'"’)\]]+$/

/** The web links in an update's text, each once, Slack's `<link|label>` form read too. Pure. */
export function groupTicketUpdateLinks(text: string): string[] {
  const found: string[] = []
  for (const match of text.matchAll(WEB_LINK)) {
    const link = (match[1] ?? match[2] ?? '').replace(TRAILING, '')
    if (ticketLink(link) && !found.includes(link)) found.push(link)
    if (found.length >= GROUP_TICKET_UPDATE_LINKS_MAX) break
  }
  return found
}

function facts(ticket: NonNullable<GroupTicketOverview['ticket']>, now: number): GroupTicketFact[] {
  const { status, priority, assignee, sprint, updatedAt } = ticket
  return [
    { label: TEXT.status, value: status },
    ...(priority ? [{ label: TEXT.priority, value: priority }] : []),
    { label: TEXT.assignee, value: assignee ?? TEXT.unassigned },
    {
      label: TEXT.sprint,
      value: !sprint ? TEXT.noSprint : sprint.open ? sprint.name : TEXT.sprintClosed(sprint.name),
    },
    ...(updatedAt ? [{ label: TEXT.updated, value: timeAgo(now, Date.parse(updatedAt)) }] : []),
  ]
}

function updateView(offer: GroupTicketUpdate, now: number): GroupTicketUpdateView {
  const permalink = slackMessageLink(offer.permalink)
  return {
    id: offer.id,
    label:
      offer.kind === 'next-round'
        ? REVIEW_OFFER_TEXT.nextUpdate(offer.author)
        : REVIEW_OFFER_TEXT.update(offer.author),
    when: timeAgo(now, Date.parse(offer.postedAt)),
    state: GROUP_TICKET_UPDATE_STATE_VIEW[offer.state],
    files: [...offer.fileNames],
    links: groupTicketUpdateLinks(offer.text),
    ...(permalink ? { permalink } : {}),
  }
}

function roundView(round: GroupTicketReviewRound, now: number): GroupTicketRoundView {
  const { n, verdict, startedAt, recordedAt, postedReply, mergedMessage } = round
  const permalink = slackMessageLink(postedReply?.permalink)
  return {
    n,
    label: TEXT.round(n),
    ...(verdict ? { verdict: REVIEW_VERDICT_VIEW[verdict] } : {}),
    when: recordedAt
      ? TEXT.recorded(timeAgo(now, Date.parse(recordedAt)))
      : TEXT.started(timeAgo(now, Date.parse(startedAt))),
    ...(postedReply
      ? { reply: { label: TEXT.replyPosted, ...(permalink ? { permalink } : {}) } }
      : {}),
    ...(mergedMessage ? { merged: mergedMessage } : {}),
  }
}

function emptyLines(overview: GroupTicketOverview): GroupTicketPageView['emptyLines'] {
  const failed = new Set(overview.problems ?? [])
  const say = (part: GroupTicketOverviewPart, empty: boolean, line: string) =>
    empty && !failed.has(part) ? { [part]: line } : {}
  return {
    ...say('updates', overview.updates.length === 0, TEXT.noUpdates),
    ...say('review', overview.review === undefined, TEXT.noReview),
    ...say('pullRequests', overview.pullRequests.length === 0, TEXT.noPullRequests),
    ...say('story', overview.story === undefined, TEXT.noStory),
    ...say('chats', overview.chats.length === 0, TEXT.noChats),
  }
}

/** The review's runs as they stand now: live where the page holds them, else as the page read them. */
function liveReviewRuns(
  overview: GroupTicketOverview,
  key: string,
  runs: GroupTicketPageRuns,
): NonNullable<GroupTicketOverview['review']>['runs'] {
  const held = new Map((runs.index.reviews.get(key.toUpperCase()) ?? []).map((r) => [r.id, r]))
  return (overview.review?.runs ?? []).map((run) => {
    const live = held.get(run.id)
    if (!live) return run
    const { closedAs: _closedAs, ...read } = run
    return {
      ...read,
      status: live.status,
      ...(live.closedAs ? { closedAs: live.closedAs.kind } : {}),
    }
  })
}

/**
 * The run a review going as a run links to: the one still going, else the one
 * its latest round was reviewed in. None for a review whose latest round is
 * inline — that one has its chat.
 */
function reviewRunOf(
  latestRound: number,
  reviewRuns: NonNullable<GroupTicketOverview['review']>['runs'],
  liveRun: GroupTicketReviewRun | undefined,
): GroupTicketReviewRun | undefined {
  return liveRun ?? reviewRuns.find((run) => run.round === latestRound)
}

function replyParts(
  overview: GroupTicketOverview,
  now: number,
  commits: ReviewCommitsView | undefined,
  reviewRuns: NonNullable<GroupTicketOverview['review']>['runs'],
): Pick<GroupTicketPageView, 'reply' | 'commits' | 'reviewChat' | 'liveRun' | 'reviewRun'> {
  const waiting = waitingReviewReply(overview.updates)
  const latestRound = Math.max(0, ...(overview.review?.rounds ?? []).map((r) => r.n))
  const liveRun = reviewRuns.find((run) => !PROCESS_RUN_TERMINAL_STATUSES.includes(run.status))
  const reviewRun = reviewRunOf(latestRound, reviewRuns, liveRun)
  const reviewChat = reviewRun
    ? undefined
    : overview.chats.find((chat) => reviewOfChat(chat.context))?.context
  return {
    ...(waiting ? { reply: reviewReplyView(waiting, latestRound, now, commits) } : {}),
    ...(!waiting && commits && commits.tone !== 'quiet' ? { commits } : {}),
    ...(reviewChat ? { reviewChat } : {}),
    ...(liveRun ? { liveRun: { id: liveRun.id, projectId: liveRun.projectId } } : {}),
    ...(reviewRun ? { reviewRun: { id: reviewRun.id, projectId: reviewRun.projectId } } : {}),
  }
}

/**
 * A ticket's page: the ticket and its facts, its updates from Slack, its
 * review's rounds newest first with its runs, its pull requests (plain links
 * when not read from GitHub), its story
 * and chats newest first, and the tab's actions on it. A part that could not
 * be read is named in `problems`; the rest still shows. On top, the newest
 * reply waiting to start the review's next round, with what was pushed since
 * its last round (`commits`, once read), else what was pushed alone. A review
 * going as a run links to its run (`reviewRun`) and offers no review chat;
 * an inline one offers its chat (`reviewChat`). The run
 * working the ticket, as its row says it, and its review's runs as they stand
 * now, from `runs` kept live. Pure.
 */
export function groupTicketPageView(
  ticketKey: string,
  overview: GroupTicketOverview,
  tabs: readonly GroupTicketTab[] | undefined,
  now: number,
  commits?: ReviewCommitsView,
  runs: GroupTicketPageRuns = NO_RUNS,
): GroupTicketPageView {
  const { ticket, tabId, actions, updates, review, pullRequests, story, chats } = overview
  const url = ticketLink(ticket?.url)
  const tabName = tabs?.find((t) => t.id === tabId)?.name
  const key = ticket?.key ?? ticketKey
  const reviewRuns = liveReviewRuns(overview, key, runs)
  const run = ticketRunState(
    {
      key,
      statusCategory: ticket?.statusCategory,
      ...(story ? { groupStory: { id: story.id, parts: story.parts } } : {}),
    },
    runs.index,
    now,
    runs.merges,
  )
  return {
    key,
    summary: ticket?.summary ?? '',
    chip: ticketChipView({
      key,
      status: ticket?.status,
      statusCategory: ticket?.statusCategory,
      title: ticket?.summary,
      url: ticket?.url,
    }),
    ...(url ? { url } : {}),
    facts: ticket ? facts(ticket, now) : [],
    ...(ticket ? { description: ticket.description.trim() || TEXT.noDescription } : {}),
    ...(tabName ? { tabName } : {}),
    actions: [...actions],
    updates: updates.map((u) => updateView(u, now)),
    ...(review
      ? {
          review: {
            rounds: [...review.rounds].sort((a, b) => b.n - a.n).map((r) => roundView(r, now)),
            findings: TEXT.openFindings(review.openFindings),
            runs: reviewRuns.map((run) => ({
              id: run.id,
              projectId: run.projectId,
              label: TEXT.runOf(run.round),
              status: run.closedAs
                ? PROCESS_RUN_CLOSED_AS_VIEW[run.closedAs]
                : PROCESS_RUN_STATUS_VIEW[run.status],
            })),
          },
        }
      : {}),
    pullRequests: pullRequests.map((pr) => ({
      url: pr.url,
      name: `${pr.repo} #${pr.number}`,
      ...(pr.title ? { title: pr.title } : {}),
      ...(pr.state ? { state: GROUP_TICKET_PR_STATE_VIEW[pr.state] } : {}),
      ...(pr.checks ? { checks: GROUP_TICKET_PR_CHECKS_VIEW[pr.checks] } : {}),
    })),
    ...(story ? { story: { ...story, parts: story.parts.map((part) => ({ ...part })) } } : {}),
    chats: [...chats]
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .map((chat) => ({
        context: chat.context,
        title: chat.title,
        when: timeAgo(now, Date.parse(chat.updatedAt)),
      })),
    ...replyParts(overview, now, commits, reviewRuns),
    ...(run ? { run } : {}),
    emptyLines: emptyLines(overview),
    problems: (overview.problems ?? []).map(
      (part) => GROUP_TICKET_PART_FAILED[part] ?? `${TEXT.partFailed} ${part}`,
    ),
  }
}
