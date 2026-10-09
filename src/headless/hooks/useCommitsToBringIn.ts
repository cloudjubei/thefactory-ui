import { useEffect, useState } from 'react'

import { getGitLog } from '../api'
import { GIT_MERGE_COUNT_LIMIT } from '../utils/gitMergeConstants'

export type CommitsToBringIn =
  | { status: 'idle' | 'loading' | 'failed' }
  | { status: 'ready'; count: number; capped: boolean }

/**
 * How many commits merging `source` into `into` would bring in — the commits
 * on `source` that `into` lacks — read for the one branch the sheet has picked,
 * up to {@link GIT_MERGE_COUNT_LIMIT}.
 */
export function useCommitsToBringIn(
  projectId: string | undefined,
  into: string | undefined,
  source: string | undefined,
): CommitsToBringIn {
  const [state, setState] = useState<CommitsToBringIn>({ status: 'idle' })
  useEffect(() => {
    if (!projectId || !into || !source || into === source) {
      setState({ status: 'idle' })
      return
    }
    const controller = new AbortController()
    setState({ status: 'loading' })
    getGitLog({
      path: { projectId },
      query: { ref: `${into}..${source}`, maxCount: GIT_MERGE_COUNT_LIMIT + 1 },
      signal: controller.signal,
      throwOnError: true,
    }).then(
      ({ data }) => {
        if (controller.signal.aborted) return
        const total = data.commits.length
        setState({
          status: 'ready',
          count: Math.min(total, GIT_MERGE_COUNT_LIMIT),
          capped: total > GIT_MERGE_COUNT_LIMIT,
        })
      },
      () => {
        if (!controller.signal.aborted) setState({ status: 'failed' })
      },
    )
    return () => controller.abort()
  }, [projectId, into, source])
  return state
}
