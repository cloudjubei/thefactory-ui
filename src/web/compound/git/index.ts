export { default as GitCommitGraph, type GitCommitGraphProps } from './commitGraph/GitCommitGraph'
export {
  default as GitCommitGraphHeader,
  type GitCommitGraphHeaderProps,
} from './commitGraph/GitCommitGraphHeader'
export {
  default as GitCommitGraphRow,
  type GitCommitGraphRowProps,
} from './commitGraph/GitCommitGraphRow'
export { computeCommitGraph, type GraphNode } from '../../../headless/utils/gitCommitGraph'

export { GitFileChangesPills, type GitFileChangesPillsProps } from './common/GitFileChangesPills'
export { default as GitFileDiffItem, type GitFileDiffItemProps } from './common/GitFileDiffItem'
export {
  default as GitFileRow,
  type GitFileRowProps,
  type GitLocalFileEntry,
} from './common/GitFileRow'
export {
  default as GitFileStatusIcon,
  type GitFileStatusIconProps,
} from './common/GitFileStatusIcon'
export { countPatchAddDel, getFilePatch } from './common/gitUtils'

// Lifted from `thefactory-overseer-web`'s `src/ui/components/git/` so web
// and desktop import the same screen-level component (used by both the
// per-project `GitView`s and the overseer `OverseerGitView`s).
export {
  default as CommitDiffViewer,
  type CommitDiffFetcher,
  type CommitDiffViewerProps,
} from './CommitDiffViewer'

export {
  default as GitCredentialErrorModal,
  type GitCredentialErrorModalProps,
  type GitCredentialErrorOp,
} from './GitCredentialErrorModal'

// Dialog family for the per-project Git view — each takes `isOpen` /
// `onClose` and drives the corresponding mutation via `useGit()`.
// Modal chrome, validation, and confirmation flows are inside; the host
// app only has to mount them as a modal stack inside `GitView`.
export { default as CommitDialog, type CommitDialogProps } from './dialogs/CommitDialog'
export { CheckoutDialog, CreateBranchDialog } from './dialogs/BranchDialogs'
export { default as StashDialog, type StashDialogProps } from './dialogs/StashDialog'
export { default as MergeDialog, type MergeDialogProps } from './dialogs/MergeDialog'
export {
  default as MergeConflictResolver,
  type MergeConflictResolverProps,
} from './dialogs/MergeConflictResolver'

export { default as GitSidebar, type GitSidebarProps } from './sidebar/GitSidebar'
export {
  default as GitSidebarBranchFolder,
  type GitSidebarBranchFolderProps,
} from './sidebar/GitSidebarBranchFolder'
export {
  default as GitSidebarBranchList,
  type GitSidebarBranchListProps,
} from './sidebar/GitSidebarBranchList'
export {
  default as GitSidebarBranchRow,
  type GitSidebarBranchRowProps,
} from './sidebar/GitSidebarBranchRow'
export {
  default as GitSidebarSectionHeader,
  type GitSidebarSectionHeaderProps,
} from './sidebar/GitSidebarSectionHeader'
export {
  default as GitSidebarStashRow,
  type GitSidebarStashRowProps,
} from './sidebar/GitSidebarStashRow'

export type {
  GitLogCommitLike,
  GitLogRefLike,
  GitMergeReportFileLike,
  GitStashListItemLike,
  GitUnifiedBranchLike,
} from './types'
