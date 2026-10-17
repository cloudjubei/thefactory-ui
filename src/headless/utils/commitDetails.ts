import { extractServerError, isGitRefUnavailableResponse } from '../api/helpers'
import { COMMIT_DETAILS_TEXT } from './commitDetailsConstants'
import type {
  CommitChanges,
  CommitDetailsSettled,
  CommitDetailsState,
  CommitDiffRead,
  CommitLogRead,
} from './commitDetailsTypes'
import { shortSha } from './verifyProof'

/**
 * A commit for its chip, from reading its log entry and its diff against its
 * parent: the commit with what it changed, the commit alone when the diff could
 * not be read, not here when git does not have it, or a failure in the server's
 * words.
 */
export function commitDetailsState(
  sha: string,
  log: CommitDetailsSettled<CommitLogRead>,
  diff: CommitDetailsSettled<CommitDiffRead>,
): Exclude<CommitDetailsState, { status: 'loading' }> {
  if (log.ok) {
    const commit = log.value.commits[0]
    if (!commit || !commit.hash.startsWith(sha)) return { status: 'missing' }
    return {
      status: 'ready',
      details: {
        sha: commit.hash,
        shortSha: shortSha(commit.hash),
        subject: commit.subject,
        authorName: commit.authorName,
        authorDate: commit.authorDate,
        ...(diff.ok
          ? {
              changes: {
                files: diff.value.files.length,
                insertions: diff.value.insertions,
                deletions: diff.value.deletions,
              },
            }
          : {}),
      },
    }
  }
  if (
    isGitRefUnavailableResponse(log.error) ||
    (!diff.ok && isGitRefUnavailableResponse(diff.error))
  ) {
    return { status: 'missing' }
  }
  return {
    status: 'failed',
    message: extractServerError(log.error, COMMIT_DETAILS_TEXT.failed).message,
  }
}

/** "3 files changed" / "1 file changed". */
export function commitChangesLabel(changes: CommitChanges): string {
  return `${changes.files} ${changes.files === 1 ? 'file' : 'files'} changed`
}

/** Where a commit opens: the project's Git view with it selected. */
export function commitGitViewPath(projectId: string, sha: string): string {
  return `/projects/${projectId}/git?commit=${encodeURIComponent(sha)}`
}
