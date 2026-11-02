/** Where a commit, and the push that may follow it, has got to. */
export type GitCommitPushPhase = 'committing' | 'pushing'

/** The requests a commit-and-push is made of, and the graph reload that follows them. */
export type GitCommitPushSteps = {
  commit: () => Promise<unknown>
  push: () => Promise<unknown>
  reload: () => Promise<unknown>
  onPhase?: (phase: GitCommitPushPhase) => void
}

/** What the commit button says. */
export type GitCommitButtonInput = {
  amend: boolean
  merging: boolean
  push: boolean
  phase?: GitCommitPushPhase
}
