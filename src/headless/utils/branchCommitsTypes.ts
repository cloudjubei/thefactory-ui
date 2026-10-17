/** The parts of a review that say where its commits can be read from. */
export type BranchCommitsReview = {
  branch: string
  baseSha: string
  headSha?: string
  mergedAt?: number
  rejectedAt?: number
}
