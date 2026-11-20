import type { ColleagueReview, ReviewPullRequestRef } from 'thefactory-tools/types'
import { latestReviewRound, reviewPullRequestsAt } from 'thefactory-tools/utils'
import { slackMessageLink } from './colleagueReviewSource'
import {
  REVIEW_MERGE_AT_STATES,
  REVIEW_MERGE_BACKEND_REPO,
  REVIEW_MERGE_PR_VIEW,
  REVIEW_MERGE_STATE_VIEW,
  REVIEW_MERGE_STOP_MAX_FILES,
  REVIEW_MERGE_STOP_TEXT,
  REVIEW_MERGE_TEXT,
} from './colleagueReviewMergeConstants'
import type {
  ReviewCardMerge,
  ReviewMergeChoosing,
  ReviewMergeJob,
  ReviewMergePullRequest,
  ReviewMergeSnapshot,
  ReviewMergeStart,
  ReviewMergeStopView,
  ReviewMergeView,
  ReviewMergeViewInput,
} from './colleagueReviewMergeTypes'

const GITHUB_PR = /^https:\/\/github\.com\/[^/]+\/([^/]+)\/pull\/(\d+)/i

function prName(url: string, repo?: string, number?: number): string {
  if (repo && number !== undefined) return `${repo} #${number}`
  const parsed = GITHUB_PR.exec(url)
  return parsed ? `${parsed[1]} #${parsed[2]}` : url
}

function repoOf(ref: ReviewPullRequestRef): string {
  return ref.repo ?? GITHUB_PR.exec(ref.url)?.[1] ?? ''
}

/** A round's pull requests in the order they are merged: the backend's first, the rest as the update gave them. Pure. */
export function reviewMergePullRequests(
  refs: readonly ReviewPullRequestRef[],
): ReviewMergePullRequest[] {
  const listed = refs.map((ref) => ({
    url: ref.url,
    name: prName(ref.url, ref.repo, ref.number),
    backend: REVIEW_MERGE_BACKEND_REPO.test(repoOf(ref)),
  }))
  return [...listed.filter((p) => p.backend), ...listed.filter((p) => !p.backend)]
}

/** What starting an approve-and-merge sends: the round, the typed Slack line, and the override when asked. Pure. */
export function reviewMergeStartBody(
  round: number,
  slackText: string,
  override: boolean,
): ReviewMergeStart {
  const text = slackText.trim()
  return { round, ...(text ? { slackText: text } : {}), ...(override ? { override: true } : {}) }
}

function slackLine(slack: ReviewMergeJob['slack']): ReviewMergeView['slack'] {
  if (!slack) return undefined
  if (slack.posted) {
    const permalink = slackMessageLink(slack.permalink)
    return { line: REVIEW_MERGE_TEXT.posted, ...(permalink ? { permalink } : {}) }
  }
  if (slack.error) return { line: REVIEW_MERGE_TEXT.notPosted(slack.error) }
  return slack.detail ? { line: slack.detail } : undefined
}

function ticketMoveLine(job: ReviewMergeJob): ReviewMergeView['ticketMove'] {
  const { ticket } = job
  if (ticket?.error) return { line: ticket.error, failed: true }
  return ticket?.detail ? { line: ticket.detail, failed: false } : undefined
}

/**
 * A ticket review's approve-and-merge as the card follows it: starting at
 * once with the round's pull requests waiting their turn, then each one's
 * state as the backend reports it, and what came of it with the Slack
 * message and the ticket's move. Nothing while no merge was started. Pure.
 */
export function reviewMergeView(input: ReviewMergeViewInput): ReviewMergeView | undefined {
  const { job, starting, prs } = input
  const named = new Map(prs.map((p) => [p.url, p.name]))
  if (starting) {
    const queued = REVIEW_MERGE_PR_VIEW.queued
    return {
      label: REVIEW_MERGE_TEXT.starting,
      tone: 'working',
      running: true,
      rows: prs.map((p) => ({ url: p.url, name: p.name, ...queued })),
    }
  }
  if (!job) return undefined
  const overall = REVIEW_MERGE_STATE_VIEW[job.state]
  const slack = slackLine(job.slack)
  const ticketMove = ticketMoveLine(job)
  return {
    ...overall,
    running: job.state === 'running',
    rows: job.pullRequests.map((p) => ({
      url: p.url,
      name: named.get(p.url) ?? prName(p.url),
      ...REVIEW_MERGE_PR_VIEW[p.state],
      ...(p.detail ? { detail: p.detail } : {}),
    })),
    ...(job.summary ? { summary: job.summary } : {}),
    ...(job.error ? { error: job.error } : {}),
    ...(slack ? { slack } : {}),
    ...(ticketMove ? { ticketMove } : {}),
  }
}

function listed(items: readonly string[]): string {
  return items.length < 2
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
}

/**
 * A merge stopped on a pull request's base, as the merge section offers it:
 * the pull request, its base and the files it conflicts on (a few, the rest
 * counted), the ask drafted for its developer — and, once the person chose,
 * what they chose in place of the two ways on: at once while it is on its
 * way, then as the backend says. Nothing for any other merge. Pure.
 */
export function reviewMergeStopView(
  job: ReviewMergeJob | null | undefined,
  choosing: ReviewMergeChoosing | undefined,
): ReviewMergeStopView | undefined {
  const stop = job?.state === 'failed' ? job.baseConflict : undefined
  if (!stop) return undefined
  const name = prName(stop.pullRequestUrl)
  const named = stop.files.slice(0, REVIEW_MERGE_STOP_MAX_FILES)
  const rest = stop.files.length - named.length
  const files = listed(rest > 0 ? [...named, REVIEW_MERGE_STOP_TEXT.more(rest)] : named)
  const permalink = slackMessageLink(stop.asked?.permalink)
  const chosen: ReviewMergeStopView['chosen'] = choosing
    ? {
        line:
          choosing.kind === 'resolve'
            ? REVIEW_MERGE_STOP_TEXT.resolving
            : REVIEW_MERGE_STOP_TEXT.posting,
        tone: 'working',
        pending: true,
      }
    : stop.resolving
      ? { line: REVIEW_MERGE_STOP_TEXT.resolvingInRun, tone: 'working', pending: false }
      : stop.asked
        ? {
            line: REVIEW_MERGE_STOP_TEXT.asked(stop.developer),
            tone: 'review',
            pending: false,
            ...(permalink ? { permalink } : {}),
          }
        : undefined
  return {
    line: stop.conflicts
      ? REVIEW_MERGE_STOP_TEXT.conflicts(name, stop.baseBranch, files)
      : REVIEW_MERGE_STOP_TEXT.behind(name, stop.baseBranch),
    askLabel: REVIEW_MERGE_STOP_TEXT.ask(stop.developer),
    draft: stop.ask,
    ...(chosen ? { chosen } : {}),
  }
}

/**
 * Approve & merge as the review card offers it on round `n`: only on the
 * latest round once it is recorded, with its pull requests — or, without any
 * listed, only to follow a merge already started. Pure.
 */
export function reviewCardMerge(
  review: ColleagueReview | null | undefined,
  n: number,
  snapshot: ReviewMergeSnapshot,
): ReviewCardMerge | undefined {
  if (!review || latestReviewRound(review) !== n) return undefined
  const round = review.rounds.find((r) => r.n === n)
  if (!round?.recordedAt) return undefined
  const prs = reviewMergePullRequests(reviewPullRequestsAt(review, n))
  const starting = snapshot.starting !== undefined
  const view = reviewMergeView({ job: snapshot.job, starting, prs })
  if (prs.length === 0 && !view) return undefined
  const stop = reviewMergeStopView(snapshot.job, snapshot.choosing)
  return {
    prs,
    ...(view ? { view } : {}),
    starting,
    ...(snapshot.refusal ? { refusal: snapshot.refusal } : {}),
    ...(snapshot.actionError ? { actionError: snapshot.actionError } : {}),
    ...(stop ? { stop } : {}),
  }
}

/**
 * An approve-and-merge in one line, for a row or a run's card: how it stands,
 * how many merged of how many, and the step the pull request it is at is on —
 * "Merging · 1 of 2 merged · waiting for checks on coach-web #77". Pure.
 */
export function reviewMergeProgressLine(job: ReviewMergeJob): string {
  const merged = job.pullRequests.filter((p) => p.state === 'merged').length
  const at = job.pullRequests.find((p) => REVIEW_MERGE_AT_STATES.includes(p.state))
  return [
    REVIEW_MERGE_STATE_VIEW[job.state].label,
    REVIEW_MERGE_TEXT.progress(merged, job.pullRequests.length),
    ...(at ? [REVIEW_MERGE_TEXT.at(REVIEW_MERGE_PR_VIEW[at.state].label, prName(at.url))] : []),
  ].join(REVIEW_MERGE_TEXT.separator)
}
