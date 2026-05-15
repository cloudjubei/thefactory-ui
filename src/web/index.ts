// Public surface for @uikit/web.
// DOM + Tailwind. May import @uikit/tokens and @uikit/headless.
//
// Conventions:
//   - Components are exposed as named exports here regardless of whether the
//     underlying module uses `export default`. Internal/deep imports remain free
//     to use the default form.
//   - Types travel with their component. Props types use the `<ComponentName>Props`
//     form; supporting unions stay alongside (e.g. `TooltipPlacement`).

// Primitives
export { default as Alert, type AlertProps, type AlertVariant } from './primitives/Alert'
export { Button, type ButtonProps } from './primitives/Button'
export { Chip, type ChipProps } from './primitives/Chip'
export { DotBadge, type DotBadgeProps } from './primitives/DotBadge'
export { default as Field, type FieldProps } from './primitives/Field'
export { Input, type InputProps, type InputSize } from './primitives/Input'
export { ConfirmDialog, Modal, type ModalProps, type ModalSize } from './primitives/Modal'
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type SelectTriggerSize,
} from './primitives/Select'
export {
  NativeSelect,
  type NativeSelectProps,
  type NativeSelectSize,
} from './primitives/NativeSelect'
export {
  default as SegmentedControl,
  type SegmentedControlProps,
  type SegmentedOption,
  type SegmentedSize,
} from './primitives/SegmentedControl'
export { default as Skeleton, SkeletonText } from './primitives/Skeleton'
export { default as Spinner } from './primitives/Spinner'
export { default as SpinnerWithDot, type SpinnerWithDotProps } from './primitives/SpinnerWithDot'
export { default as Surface, type SurfaceProps } from './primitives/Surface'
export { Switch, type SwitchProps } from './primitives/Switch'
export { Textarea } from './primitives/Textarea'
export { ToastProvider, useToast, type ToastMessage, type ToastVariant } from './primitives/Toast'
export {
  default as Tooltip,
  type TooltipPlacement,
  type TooltipProps,
  type TooltipSideAlign,
  type TooltipVariant,
} from './primitives/Tooltip'

// Compound
export { BranchChip, type BranchChipProps, type BranchChipType } from './compound/BranchChip'
export { default as Code, type CodeProps } from './compound/Code'
export {
  default as CollapsibleSidebar,
  type CollapsibleSidebarItem,
  type CollapsibleSidebarProps,
} from './compound/CollapsibleSidebar'
export {
  DiffViewer,
  generateHunkPatch,
  generateSelectedPatch,
  InlineTextDiff,
  parseUnifiedDiff,
  SimpleSplitText,
  SimpleUnifiedDiff,
  StructuredUnifiedDiff,
  type DiffViewerProps,
  type IntraMode,
  type ParsedHunk,
  type StructuredUnifiedDiffProps,
} from './compound/diff'
export {
  applyMention,
  applyReference,
  FileDisplay,
  FileMentionsTextarea,
  classifyFileByExtension,
  FileInfoButton,
  FilePane,
  FilePaneHeader,
  FileSelector,
  HtmlEditor,
  FileTree,
  FileTypeIcon,
  ImageViewer,
  parseMention,
  parseReference,
  PdfViewer,
  rankMentionMatches,
  RichText,
  type FileDisplayProps,
  type FileInfoButtonProps,
  type FileInfoData,
  type FileMentionsTextareaProps,
  type FilePaneHeaderProps,
  type FilePaneKind,
  type FilePaneProps,
  type FileSelectorProps,
  type FileTreeEntry,
  type FileTreeProps,
  type FileTypeIconProps,
  type HtmlEditorPaneView,
  type HtmlEditorProps,
  type ImageViewerProps,
  type MentionParse,
  type PdfViewerProps,
  type ReferenceParse,
  type ReferenceSuggestion,
  type RichTextProps,
  type UikitFileMeta,
} from './compound/files'
export {
  CostChip,
  ProjectChip,
  StatusChip,
  StatusIcon,
  TokensChip,
  TurnChip,
  type ChipState,
  type CostChipProps,
  type ProjectChipProps,
  type StatusChipProps,
  type TokensChipProps,
} from './compound/chips'
export {
  CommandPalette,
  type CommandPaletteItem,
  type CommandPaletteProps,
} from './compound/CommandPalette'
export { default as JsonView, type JsonViewProps } from './compound/JsonView'
export { default as Markdown, type MarkdownProps } from './compound/Markdown'
export {
  default as MarkdownEditor,
  MARKDOWN_PANE_OPTIONS,
  type MarkdownEditorPaneView,
  type MarkdownEditorProps,
} from './compound/MarkdownEditor'
export {
  default as NotificationBadge,
  getNotificationBadgeColorClass,
  type NotificationBadgeColor,
  type NotificationBadgeProps,
} from './compound/NotificationBadge'
export {
  ICON_RAIL_DEFAULT_WIDTH,
  IconRail,
  IconRailButton,
  type IconRailButtonProps,
  type IconRailProps,
} from './compound/IconRail'
export { PathDisplay, splitPath } from './compound/PathDisplay'
export {
  PROJECT_ICON_REGISTRY,
  PROJECT_ICONS,
  renderProjectIcon,
  type ProjectIconKey,
} from './compound/projectIcons'
export { ResizeHandle, type ResizeHandleProps } from './compound/ResizeHandle'
export { default as SafeText, type SafeTextProps } from './compound/SafeText'
export { CodeInfoChip, type CodeInfoChipProps } from './compound/CodeInfoChip'
export { CopyButton, type CopyButtonProps } from './compound/CopyButton'
export {
  FeatureCard,
  type FeatureCardData,
  type FeatureCardProps,
} from './compound/FeatureCard'
export {
  StoryCard,
  type StoryCardData,
  type StoryCardProps,
  type StoryStatus,
} from './compound/StoryCard'
export {
  default as StatusControl,
  StatusPicker,
  STATUS_LABELS,
  STATUS_ORDER,
  statusKey,
  type StatusControlProps,
  type StatusPickerProps,
  type StatusPickerValue,
  type StatusSemanticKey,
} from './compound/StatusControl'
export {
  default as DependencyChip,
  type DependencyChipKind,
  type DependencyChipProps,
  type DependencyChipVariant,
} from './compound/DependencyChip'
export {
  STORY_SORT_OPTIONS,
  FEATURE_SORT_OPTIONS,
  STATUS_OPTIONS,
  type StoryListSorting,
  type FeatureListSorting,
} from './compound/storiesOptions'
export {
  default as RunAgentButton,
  AgentTypePicker,
  type AgentRunType,
  type AgentTypePickerProps,
  type RunAgentButtonProps,
} from './compound/RunAgentButton'
export {
  default as StoryForm,
  type StoryFormProps,
  type StoryFormValues,
} from './compound/StoryForm'
export { renderLanguageIcon, type CodeInfoLanguage } from './compound/codeInfoIcons'
export { SecretInput, type SecretInputProps } from './compound/SecretInput'
export {
  TimeAxisHeader,
  TimeAxisRow,
  type TimeAxisHeaderGroup,
  type TimeAxisHeaderProps,
  type TimeAxisRowProps,
  type TimeAxisUnit,
} from './compound/TimeAxis'
export { default as TypewriterText, type TypewriterTextProps } from './compound/TypewriterText'
export {
  ShortcutsHelpView,
  type ShortcutEntry,
  type ShortcutsHelpViewProps,
} from './compound/ShortcutsHelpView'
export {
  UsageModal,
  type UsageModalCostAggregate,
  type UsageModalCostBreakdown,
  type UsageModalMessage,
  type UsageModalModelPrice,
  type UsageModalProps,
  type UsageModalUsage,
} from './compound/UsageModal'
export {
  ModelChip,
  type ModelChipConfig,
  type ModelChipMode,
  type ModelChipProps,
} from './compound/ModelChip'
export {
  ChatSidebarPanel,
  type ChatSidebarPanelChildrenArgs,
  type ChatSidebarPanelProps,
} from './compound/ChatSidebarPanel'

// Tests view (lifted from web + desktop's TestsView)
export {
  CoverageTable,
  TEST_CONFIG_PATTERN,
  TestCustomConfigInput,
  TestResultsList,
  TestsAggregateBar,
  TestsProgressBar,
  formatUncoveredLines,
  isTestConfigPath,
  msToShort,
  pctBarClass,
  pctColorClass,
  type CoverageFileStatsLike,
  type CoverageResultLike,
  type CoverageTableProps,
  type TestConfigCandidate,
  type TestConfigEnvVarLike,
  type TestCustomConfigInputProps,
  type TestFailureLike,
  type TestNameLike,
  type TestResultLike,
  type TestResultsListProps,
  type TestStatusLike,
  type TestSummaryLike,
  type TestsAggregateBarProps,
  type TestsProgressBarProps,
  type TestsResultLike,
} from './compound/tests'

// Git view (lifted from web + desktop's GitView)
export {
  GitCommitGraph,
  GitCommitGraphHeader,
  GitCommitGraphRow,
  GitFileChangesPills,
  GitFileDiffItem,
  GitFileRow,
  GitFileStatusIcon,
  GitSidebar,
  GitSidebarBranchFolder,
  GitSidebarBranchList,
  GitSidebarBranchRow,
  GitSidebarSectionHeader,
  GitSidebarStashRow,
  computeCommitGraph,
  countPatchAddDel,
  getFilePatch,
  type GitCommitGraphHeaderProps,
  type GitCommitGraphProps,
  type GitCommitGraphRowProps,
  type GitFileChangesPillsProps,
  type GitFileDiffItemProps,
  type GitFileRowProps,
  type GitFileStatusIconProps,
  type GitLocalFileEntry,
  type GitLogCommitLike,
  type GitLogRefLike,
  type GitMergeReportFileLike,
  type GitSidebarBranchFolderProps,
  type GitSidebarBranchListProps,
  type GitSidebarBranchRowProps,
  type GitSidebarProps,
  type GitSidebarSectionHeaderProps,
  type GitSidebarStashRowProps,
  type GitStashListItemLike,
  type GitUnifiedBranchLike,
  type GraphNode,
} from './compound/git'

// Utils
export { cn } from './utils/cn'
