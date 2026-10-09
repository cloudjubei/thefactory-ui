import { useEffect, useMemo } from 'react'

import { useGit } from '../contexts/GitContext'
import { resolveCommitLink } from '../utils/gitCommitLink'
import type { GitCommitLinkResolution } from '../utils/gitCommitLinkTypes'

/**
 * A Git view `?commit=` link resolved against the loaded log: a unique prefix
 * becomes the full sha, and while the commit is not loaded yet the log pages
 * further — up to the bound in `resolveCommitLink` — before it says so.
 */
export function useGitCommitLink(link: string | undefined): GitCommitLinkResolution {
  const { log, hasMoreLog, isLogLoading, loadMoreLog, isLoaded } = useGit()
  const resolution = useMemo(
    () => resolveCommitLink({ link, log, hasMore: hasMoreLog }),
    [link, log, hasMoreLog],
  )
  const searching = isLoaded && resolution.state === 'searching'
  useEffect(() => {
    if (searching && !isLogLoading) void loadMoreLog()
  }, [searching, isLogLoading, loadMoreLog])
  return isLoaded || resolution.state === 'found' ? resolution : { state: 'none' }
}
