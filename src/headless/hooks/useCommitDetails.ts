import { useEffect, useState } from 'react'

import { getGitBranchDiffSummary, getGitLog } from '../api'
import { commitDetailsState } from '../utils/commitDetails'
import type { CommitDetailsSettled, CommitDetailsState } from '../utils/commitDetailsTypes'
import { CommitDetailsCache } from './commitDetailsCache'

const settle = <T>(read: Promise<{ data: T }>): Promise<CommitDetailsSettled<T>> =>
  read.then(
    ({ data }) => ({ ok: true as const, value: data }),
    (error: unknown) => ({ ok: false as const, error }),
  )

const commitDetailsCache = new CommitDetailsCache(async (projectId, sha) => {
  const [log, diff] = await Promise.all([
    settle(
      getGitLog({ path: { projectId }, query: { ref: sha, maxCount: 1 }, throwOnError: true }),
    ),
    settle(
      getGitBranchDiffSummary({
        path: { projectId },
        body: { baseRef: `${sha}^`, headRef: sha },
        throwOnError: true,
      }),
    ),
  ])
  return commitDetailsState(sha, log, diff)
})

/**
 * A commit for its chip's hover card — its subject, author, date and what it
 * changed — read once per project and sha, and only once something mounts this.
 */
export function useCommitDetails(projectId: string, sha: string): CommitDetailsState {
  const [state, setState] = useState<CommitDetailsState>(
    () => commitDetailsCache.peek(projectId, sha) ?? { status: 'loading' },
  )
  useEffect(() => {
    let live = true
    const known = commitDetailsCache.peek(projectId, sha)
    setState(known ?? { status: 'loading' })
    if (known) return
    void commitDetailsCache.get(projectId, sha).then((result) => {
      if (live) setState(result)
    })
    return () => {
      live = false
    }
  }, [projectId, sha])
  return state
}
