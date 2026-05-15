// Structural types the Git-view components consume. Mirrors the domain
// shapes from `thefactory-tools` (`GitLogCommit`, `GitUnifiedBranch`, etc.)
// but stays in this package so consumers don't need a hard dep on the
// tools package — both web and desktop already produce data in this shape.

export type GitLogRefLike = {
  type: 'branch' | 'remote' | 'tag' | 'HEAD'
  name: string
}

export type GitLogCommitLike = {
  hash: string
  parents: string[]
  subject: string
  authorName: string
  authorEmail: string
  authorDate: number
  refs: GitLogRefLike[]
}

export type GitUnifiedBranchLike = {
  name: string
  fullName?: string
  isLocal: boolean
  isRemote: boolean
  remoteName?: string
  upstreamRemote?: string
  upstreamBranch?: string
  localSha?: string
  remoteSha?: string
  ahead?: number
  behind?: number
  storyId?: string
  current?: boolean
}

export type GitStashListItemLike = {
  ref: string
  index?: number
  message: string
}

/**
 * Structural shape of a single file entry inside a merge report (or any
 * other "diff summary with optional patch" payload). Matches
 * `thefactory-tools` `GitMergeReportFile` field-for-field but stays
 * structural so this package doesn't take a hard dep on the tools package.
 */
export type GitMergeReportFileLike = {
  path: string
  status: string
  additions?: number
  deletions?: number
  renameFrom?: string
  renameScore?: number
  binary?: boolean
  submodule?: boolean
  patch?: string
  patchTruncated?: boolean
}
