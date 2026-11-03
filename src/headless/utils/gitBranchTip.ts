import type { GitUnifiedBranch } from '../api/generated'
import { UNCOMMITTED_COMMIT_HASH } from './gitCommitGraph'

/**
 * The commit a branch row stands for in the graph: the uncommitted changes for
 * the current branch's local row while the tree is dirty (the graph draws them
 * as its top row), else the tip of the side picked — the remote row's remote
 * tip, the local row's local tip — falling back to the side that exists. Pure.
 */
export function gitBranchTipSha(
  branch: Pick<GitUnifiedBranch, 'current' | 'localSha' | 'remoteSha'>,
  section: 'local' | 'remote' | undefined,
  dirty: boolean,
): string | undefined {
  if (branch.current && dirty && section !== 'remote') return UNCOMMITTED_COMMIT_HASH
  return section === 'remote'
    ? (branch.remoteSha ?? branch.localSha)
    : (branch.localSha ?? branch.remoteSha)
}
