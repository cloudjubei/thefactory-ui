import { GIT_COMMIT_PUSH_TEXT } from './gitCommitPushConstants'
import type { GitCommitButtonInput, GitCommitPushSteps } from './gitCommitPushTypes'

/** A push that failed after its commit was made: the commit stands, only the push is left. */
export class GitPushAfterCommitError extends Error {
  override readonly cause: unknown

  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause))
    this.name = 'GitPushAfterCommitError'
    this.cause = cause
  }
}

/**
 * Commit, then push straight away when asked — neither waits on the git graph
 * reloading, which runs once after the last request and never fails the
 * commit. A refused commit stops there; a failed push throws
 * {@link GitPushAfterCommitError}, the commit having been made.
 */
export async function commitThenPush(
  steps: GitCommitPushSteps,
  options: { push: boolean },
): Promise<void> {
  steps.onPhase?.('committing')
  await steps.commit()
  try {
    if (!options.push) return
    steps.onPhase?.('pushing')
    try {
      await steps.push()
    } catch (err) {
      throw new GitPushAfterCommitError(err)
    }
  } finally {
    void steps.reload().catch(() => undefined)
  }
}

/** The commit button's words: the step under way, else what pressing it does. */
export function commitButtonLabel(input: GitCommitButtonInput): string {
  if (input.phase === 'committing') return GIT_COMMIT_PUSH_TEXT.committing
  if (input.phase === 'pushing') return GIT_COMMIT_PUSH_TEXT.pushing
  const verb = input.merging
    ? GIT_COMMIT_PUSH_TEXT.commitMerge
    : input.amend
      ? GIT_COMMIT_PUSH_TEXT.amend
      : GIT_COMMIT_PUSH_TEXT.commit
  return input.push ? `${verb}${GIT_COMMIT_PUSH_TEXT.andPush}` : verb
}
