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

export {
  default as GitCredentialErrorModal,
  type GitCredentialErrorModalProps,
  type GitCredentialErrorOp,
} from './GitCredentialErrorModal'

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
