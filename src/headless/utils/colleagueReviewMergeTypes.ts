import type {
  ApproveAndMergeColleagueReviewData,
  GetColleagueReviewMergeResponse,
} from '../api/generated'
import type { ProcessStatusTone } from './processView'

/** What the merge did with the ticket's Jira status once its pull requests merged. */
export interface ReviewMergeTicketMove {
  moved: boolean
  /** The status it was to move to. */
  status: string
  from?: string
  /** What came of it, in a line: "Moved ZNR-1 to In QA". */
  detail?: string
  /** Why it did not move. */
  error?: string
}

/** A ticket review's approve-and-merge job, as the backend tells it. */
export type ReviewMergeJob = GetColleagueReviewMergeResponse & {
  /** Only when the group moves a ticket once it merged. */
  ticket?: ReviewMergeTicketMove
}

/** Where one pull request of the job stands. */
export type ReviewMergePullRequestState = ReviewMergeJob['pullRequests'][number]['state']

/** What starting an approve-and-merge sends. */
export type ReviewMergeStart = ApproveAndMergeColleagueReviewData['body']

/** A round's pull request, as the merge confirm lists it. */
export interface ReviewMergePullRequest {
  url: string
  /** "coach-be #418"; the link for one it cannot read. */
  name: string
  /** Its repository is the backend's: it is merged first. */
  backend: boolean
}

/** One pull request's row in the merge's progress. */
export interface ReviewMergeRowView {
  url: string
  name: string
  label: string
  tone: ProcessStatusTone
  /** Why it stands there: the checks waited on, GitHub's words. */
  detail?: string
}

/** A ticket review's approve-and-merge as the review card follows it. */
export interface ReviewMergeView {
  label: string
  tone: ProcessStatusTone
  /** Still going: nothing to start again yet. */
  running: boolean
  rows: ReviewMergeRowView[]
  /** Once finished: what merged, or where it stopped and why. */
  summary?: string
  /** Why it stopped when no one pull request is to blame. */
  error?: string
  /** What the update's Slack thread heard. */
  slack?: { line: string; permalink?: string }
  /** What became of the ticket's status: moved, or why not. */
  ticketMove?: { line: string; failed: boolean }
}

/** What the merge's view is built from. */
export interface ReviewMergeViewInput {
  /** `null` while no merge was started, `undefined` until read. */
  job: ReviewMergeJob | null | undefined
  /** The person's start is on its way. */
  starting?: boolean
  /** The round's pull requests, in the order they merge. */
  prs: readonly ReviewMergePullRequest[]
}

/** What the person chose at a merge stopped on a pull request's base, on its way: resolving it here, or asking the developer with this text. */
export type ReviewMergeChoosing = { kind: 'resolve' } | { kind: 'ask'; text: string }

/** A ticket review's approve-and-merge as views draw it. */
export interface ReviewMergeSnapshot {
  job: ReviewMergeJob | null | undefined
  readError: string | undefined
  /** The person's start, on its way. */
  starting: ReviewMergeStart | undefined
  /** The backend asked first, since the round asked for changes: "Merge anyway" sends it again. */
  refusal: string | undefined
  actionError: string | undefined
  /** The person's answer to a stop on a pull request's base, on its way. */
  choosing: ReviewMergeChoosing | undefined
}

/** A merge stopped on a pull request's base: what is in the way, and the two ways on — resolve it here, or ask the developer. */
export interface ReviewMergeStopView {
  /** "coach-be #418 conflicts with main in src/app.ts" */
  line: string
  /** "Ask Ana" */
  askLabel: string
  /** The message drafted for the developer, to edit before it is sent. */
  draft: string
  /** What the person chose — on its way, or done — in place of the two ways on. */
  chosen?: { line: string; tone: ProcessStatusTone; pending: boolean; permalink?: string }
}

/** Approve & merge on the review card's latest round: what it offers and how it goes. */
export interface ReviewCardMerge {
  /** The round's pull requests, in the order they merge. */
  prs: ReviewMergePullRequest[]
  /** The merge as it goes; absent while none was started. */
  view?: ReviewMergeView
  /** The person's start is on its way. */
  starting: boolean
  /** The backend asked first, since the round asked for changes. */
  refusal?: string
  actionError?: string
  /** Where it stopped on a pull request's base, and the ways on. */
  stop?: ReviewMergeStopView
}
