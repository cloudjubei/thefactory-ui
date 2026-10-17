import { useEffect, useState } from 'react'

import { getGitLog } from '../api'
import { isGitRefUnavailableResponse } from '../api/helpers'
import { branchCommitsRefs, commitsSinceBase, type BranchCommit } from '../utils/branchCommits'
import { BRANCH_COMMITS_LOG_LIMIT } from '../utils/branchCommitsConstants'
import type { BranchCommitsReview } from '../utils/branchCommitsTypes'

const goneRefsByProject = new Map<string, Set<string>>()

function goneRefs(projectId: string): Set<string> {
  let gone = goneRefsByProject.get(projectId)
  if (!gone) {
    gone = new Set()
    goneRefsByProject.set(projectId, gone)
  }
  return gone
}

/**
 * The commits a review added, for its Changes header — read from the first of
 * its refs git still has. A ref git answers it does not have is remembered and
 * not asked for again; when none is left there is no count, and nothing is said.
 */
export function useBranchCommits(
  projectId: string | undefined,
  review: BranchCommitsReview | undefined,
): BranchCommit[] {
  const [commits, setCommits] = useState<BranchCommit[]>([])
  const baseSha = review?.baseSha
  const refsKey = branchCommitsRefs(review).join('\n')
  useEffect(() => {
    if (!projectId || !baseSha) return
    const gone = goneRefs(projectId)
    const refs = refsKey ? refsKey.split('\n').filter((ref) => !gone.has(ref)) : []
    let cancelled = false
    void (async () => {
      for (const ref of refs) {
        try {
          const { data } = await getGitLog({
            path: { projectId },
            query: { ref, maxCount: BRANCH_COMMITS_LOG_LIMIT },
            throwOnError: true,
          })
          if (!cancelled) setCommits(commitsSinceBase(data.commits, baseSha))
          return
        } catch (err: unknown) {
          if (!isGitRefUnavailableResponse(err)) return
          gone.add(ref)
        }
      }
      if (!cancelled) setCommits([])
    })()
    return () => {
      cancelled = true
    }
  }, [projectId, baseSha, refsKey])
  return commits
}
