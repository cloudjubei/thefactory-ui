import type { ColleagueReview, ReviewPullRequestRef } from 'thefactory-tools/types'
import { latestReviewRound } from 'thefactory-tools/utils'
import { slackMessageLink } from './colleagueReviewSource'
import {
  REVIEW_MERGE_BACKEND_REPO,
  REVIEW_MERGE_PR_VIEW,
  REVIEW_MERGE_STATE_VIEW,
  REVIEW_MERGE_TEXT,
} from './colleagueReviewMergeConstants'
import type {
  ReviewCardMerge,
  ReviewMergeJob,
  ReviewMergePullRequest,
  ReviewMergeSnapshot,
  ReviewMergeStart,
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

/**
 * A ticket review's approve-and-merge as the card follows it: starting at
 * once with the round's pull requests waiting their turn, then each one's
 * state as the backend reports it, and what came of it with the Slack
 * message. Nothing while no merge was started. Pure.
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
  const prs = reviewMergePullRequests(round.submission.pullRequests)
  const starting = snapshot.starting !== undefined
  const view = reviewMergeView({ job: snapshot.job, starting, prs })
  if (prs.length === 0 && !view) return undefined
  return {
    prs,
    ...(view ? { view } : {}),
    starting,
    ...(snapshot.refusal ? { refusal: snapshot.refusal } : {}),
    ...(snapshot.actionError ? { actionError: snapshot.actionError } : {}),
  }
}
