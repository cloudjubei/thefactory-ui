import type {
  GetColleagueReviewChecksResponse,
  SetColleagueReviewCheckRequiredData,
} from '../api/generated'

/** The checks seen on a group's recent pull requests, by repository, as the backend tells them. */
export type ReviewMergeChecks = GetColleagueReviewChecksResponse

/** Whether merges wait for one check of one repository. */
export type ReviewCheckRequirement = SetColleagueReviewCheckRequiredData['body']

/** A group's merge checks as views draw them: the backend's word, the person's changes on their way over it. */
export interface ReviewMergeChecksSnapshot {
  /** `undefined` until the first read answers. */
  checks: ReviewMergeChecks | undefined
  readError: string | undefined
  /** The person's changes on their way, in the order made. */
  changes: readonly ReviewCheckRequirement[]
  /** Why the person's last change did not go through. */
  actionError: string | undefined
}

/** One check as Settings shows it. */
export interface ReviewMergeCheckView {
  repository: string
  name: string
  required: boolean
  /** The person's change to it is on its way. */
  saving: boolean
}

/** A repository's checks as Settings shows them. */
export interface ReviewMergeChecksRepositoryView {
  repository: string
  checks: ReviewMergeCheckView[]
  /** Why its checks could not be read, in a line. */
  error?: string
}

/** The checks a group's merges wait for, as Settings shows them. */
export interface ReviewMergeChecksView {
  /** The first read is still out. */
  loading: boolean
  repositories: ReviewMergeChecksRepositoryView[]
  /** Read, and no repository has a check to list. */
  empty: boolean
  readError?: string
  actionError?: string
}
