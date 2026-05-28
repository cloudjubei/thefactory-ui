// Public surface for @uikit/native.
// React Native peers of `src/web/`. May import @uikit/tokens and @uikit/headless.
//
// Conventions mirror `src/web/index.ts`: components are surfaced as named
// exports regardless of whether the underlying module uses `export default`;
// types travel with their component as `<ComponentName>Props`.

export * from '../tokens/native'

// Hooks — runtime theme accessor (NativeWind-driven). Every chrome / surface
// component that switches colours on theme change reads through this hook.
export { useNativeTheme, type NativeThemeValue } from './hooks/useNativeTheme'

// Primitives
export { default as Alert, type AlertProps, type AlertVariant } from './primitives/Alert'
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './primitives/Button'
export {
  default as IconButton,
  type IconButtonProps,
  type IconButtonSize,
} from './primitives/IconButton'
export { default as DotBadge, type DotBadgeProps } from './primitives/DotBadge'
export { default as Field, type FieldProps } from './primitives/Field'
export { Input, type InputProps, type InputSize } from './primitives/Input'
export {
  ConfirmDialog,
  Modal,
  type ConfirmDialogProps,
  type ModalProps,
  type ModalSize,
} from './primitives/Modal'
export { OverlayProvider, OverlayPortal, useHasOverlayProvider } from './primitives/Overlay'
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type SelectContentProps,
  type SelectGroupProps,
  type SelectItemProps,
  type SelectProps,
  type SelectTriggerProps,
  type SelectTriggerSize,
  type SelectValueProps,
} from './primitives/Select'
export {
  default as SegmentedControl,
  type SegmentedControlProps,
  type SegmentedOption,
  type SegmentedSize,
} from './primitives/SegmentedControl'
export {
  default as Skeleton,
  SkeletonText,
  type SkeletonProps,
  type SkeletonTextProps,
} from './primitives/Skeleton'
export { default as Spinner, type SpinnerProps } from './primitives/Spinner'
export { default as SpinnerWithDot, type SpinnerWithDotProps } from './primitives/SpinnerWithDot'
export { Slider, type SliderProps } from './primitives/Slider'
export { SecretInput, type SecretInputProps } from './primitives/SecretInput'
export { Switch, type SwitchProps } from './primitives/Switch'
export { Textarea, type TextareaProps } from './primitives/Textarea'
export { ToastProvider, useToast, type ToastMessage, type ToastVariant } from './primitives/Toast'
export {
  default as Tooltip,
  type TooltipPlacement,
  type TooltipProps,
  type TooltipSideAlign,
  type TooltipVariant,
} from './primitives/Tooltip'

// Compounds
export { BranchChip, type BranchChipProps, type BranchChipType } from './compound/BranchChip'
export {
  default as DependencyChip,
  type DependencyChipKind,
  type DependencyChipProps,
  type DependencyChipVariant,
} from './compound/DependencyChip'
export { FeatureCard, type FeatureCardData, type FeatureCardProps } from './compound/FeatureCard'
export {
  default as NotificationBadge,
  getNotificationBadgeColor,
  type NotificationBadgeColor,
  type NotificationBadgeProps,
} from './compound/NotificationBadge'
export {
  default as StatusControl,
  STATUS_LABELS,
  STATUS_ORDER,
  statusKey,
  statusLabel,
  type StatusControlProps,
  type StatusSemanticKey,
  type StoryStatus,
} from './compound/StatusControl'
export { StoryCard, type StoryCardData, type StoryCardProps } from './compound/StoryCard'
export {
  PROJECT_ICON_REGISTRY,
  PROJECT_ICONS,
  renderProjectIcon,
  type ProjectIconKey,
} from './compound/projectIcons'
export { default as CodeInfoChip, type CodeInfoChipProps } from './compound/CodeInfoChip'
export { renderLanguageIcon, type CodeInfoLanguage } from './compound/codeInfoIcons'
export {
  default as ActionMenu,
  type ActionMenuItem,
  type ActionMenuProps,
} from './compound/ActionMenu'
export { default as CostChip, type CostChipProps } from './compound/chips/CostChip'
export { default as ProjectChip, type ProjectChipProps } from './compound/chips/ProjectChip'
export {
  default as StatusChip,
  type ChipState,
  type StatusChipProps,
} from './compound/chips/StatusChip'
export { default as TokensChip, type TokensChipProps } from './compound/chips/TokensChip'
export { default as TurnChip, type TurnChipProps } from './compound/chips/TurnChip'
export {
  default as DependencyBullet,
  type DependencyBulletProps,
  type DependencyCardShape,
  type ResolvedDependency,
} from './compound/stories/DependencyBullet'
export {
  default as ExclamationChip,
  type ExclamationChipProps,
} from './compound/stories/ExclamationChip'
export {
  default as StoryAndFeatureCallout,
  type StoryAndFeatureCalloutProps,
} from './compound/stories/StoryAndFeatureCallout'
export { default as WarningChip, type WarningChipProps } from './compound/stories/WarningChip'
export {
  default as AgentModelQuickSelect,
  type AgentModelQuickSelectProps,
  type ModelQuickSelectOption,
} from './compound/agents/AgentModelQuickSelect'
export {
  default as AgentRunBullet,
  type AgentRunBulletData,
  type AgentRunBulletProps,
} from './compound/agents/AgentRunBullet'
export {
  default as AgentRunRowCard,
  type AgentRunRowCardData,
  type AgentRunRowCardProps,
} from './compound/agents/AgentRunRowCard'
export {
  ModelChip,
  type ModelChipConfig,
  type ModelChipMode,
  type ModelChipProps,
  type ModelPriceRecord,
} from './compound/ModelChip'
export {
  default as RunAgentButton,
  AGENT_RUN_TYPES,
  AGENT_RUN_TYPE_LABELS,
  type AgentRunType,
  type RunAgentButtonProps,
} from './compound/RunAgentButton'
export {
  default as StoryForm,
  type StoryFormHandle,
  type StoryFormProps,
  type StoryFormValues,
} from './compound/StoryForm'
export { PathDisplay, splitPath, type PathDisplayProps } from './compound/PathDisplay'
export {
  default as FileDisplay,
  type FileDisplayProps,
  type UikitFileMeta,
} from './compound/files/FileDisplay'
export { default as FileSelector, type FileSelectorProps } from './compound/files/FileSelector'
export {
  default as ContextFileChip,
  type ContextFileChipProps,
} from './compound/stories/ContextFileChip'
export { default as RichText, type RichTextProps } from './compound/files/RichText'
export {
  default as GroupHome,
  type GroupHomeProjectCard,
  type GroupHomeProps,
} from './compound/GroupHome'
export { default as BottomSheet, type BottomSheetProps } from './primitives/BottomSheet'
export { default as ChatBody, type ChatBodyProps } from './compound/chat/ChatBody'
export { default as ChatHeader, type ChatHeaderProps } from './compound/chat/ChatHeader'
export {
  default as ChatSettingsDropdown,
  type ChatSettingsDropdownProps,
  type CompletionSettingsLike,
  type ToolToggle,
} from './compound/chat/ChatSettingsDropdown'
export {
  default as HistorySummarizationSettings,
  type HistorySummarization,
  type HistorySummarizationSettingsProps,
} from './compound/chat/HistorySummarizationSettings'
export {
  default as MessageSanitizationSettings,
  type MessageSanitization,
  type MessageSanitizationSettingsProps,
} from './compound/chat/MessageSanitizationSettings'
export {
  default as ChatTopicCreateModal,
  type ChatTopicCreateModalProps,
} from './compound/chat/ChatTopicCreateModal'
export {
  default as SystemPromptViewerModal,
  type SystemPromptViewerModalProps,
} from './compound/chat/SystemPromptViewerModal'
export {
  default as ToolConfirmationModal,
  type ToolConfirmationModalProps,
} from './compound/chat/ToolConfirmationModal'
export {
  default as UsageModal,
  type UsageModalProps,
  type UsageModelRow,
} from './compound/chat/UsageModal'
export {
  default as MessageUsageSheet,
  type MessageUsageSheetProps,
} from './compound/chat/MessageUsageSheet'
export {
  default as ChatInput,
  type ChatInputAttachment,
  type ChatInputProps,
} from './compound/chat/ChatInput'
export { default as MessageList, type MessageListProps } from './compound/chat/MessageList'
export { default as MessageRow, type MessageRowProps } from './compound/chat/MessageRow'
export {
  default as ToolCallCard,
  type ToolCallCardProps,
} from './compound/chat/ToolCall/ToolCallCard'
export {
  default as ToolPreviewSheet,
  type ToolPreviewSheetProps,
} from './compound/chat/ToolCall/ToolPreviewSheet'
export {
  FieldDiff,
  InlineOldNew,
  MonoText,
  NewContentOnly,
  PatchPreview,
  PreLimited,
  ReorderList,
  Row,
  SecondaryText,
  SectionTitle,
  SmallBadge,
  WriteMultiToolsPreview,
  WriteToolsPreview,
  renderToolPreviewNative,
  type FeatureShape,
  type RenderToolPreviewArgs,
  type StoryShape,
  type ToolPreview,
  type ToolPreviewHooks,
  type WriteMultiToolsPreviewProps,
  type WriteToolsPreviewProps,
} from './compound/chat/toolPreviews'
export {
  default as ChatDynamicContextModal,
  type ChatDynamicContextModalProps,
} from './compound/chat/ChatDynamicContextModal'
export {
  default as SystemPromptBubble,
  type SystemPromptBubbleProps,
} from './compound/chat/SystemPromptBubble'
export { default as ThinkingRow, type ThinkingRowProps } from './compound/chat/ThinkingRow'

// Timeline / Gantt compound (project timeline screen — body)
export {
  TimelineGantt,
  type TimelineGanttLabel,
  type TimelineGanttProps,
  type TimelineGanttStory,
} from './compound/timeline/TimelineGantt'

// Status / shell compounds
export {
  default as DisconnectedBanner,
  type DisconnectedBannerProps,
} from './compound/DisconnectedBanner'
export { default as AppHeader, type AppHeaderProps } from './compound/shell/AppHeader'
export {
  default as NavDrawer,
  type NavDrawerGroup,
  type NavDrawerItem,
  type NavDrawerProps,
} from './compound/shell/NavDrawer'
export { default as ScreenShell, type ScreenShellProps } from './compound/shell/ScreenShell'

// Text / code viewers
export { default as Markdown, type MarkdownProps } from './compound/Markdown'
export { default as Code, type CodeProps } from './compound/Code'
export {
  default as FileMentionsTextarea,
  type FileMentionsTextareaHandle,
  type FileMentionsTextareaProps,
} from './compound/files/FileMentionsTextarea'

// Rich-input compounds (FeatureForm + DependencySelector)
export {
  default as DependencySelector,
  type DependencySelectorProps,
} from './compound/stories/DependencySelector'
export {
  default as FeatureForm,
  type FeatureFormHandle,
  type FeatureFormProps,
  type FeatureFormValues,
  type FeatureFormInitialValues,
} from './compound/stories/FeatureForm'

export {
  default as FileTree,
  type FileTreeEntry,
  type FileTreeProps,
} from './compound/files/FileTree'
export { default as ImageViewer, type ImageViewerProps } from './compound/files/ImageViewer'
export { default as FileTypeIcon, type FileTypeIconProps } from './compound/files/FileTypeIcon'
export {
  default as FilePaneHeader,
  type FilePaneHeaderProps,
} from './compound/files/FilePaneHeader'

// Git screen compounds
export { default as UnifiedDiff, type UnifiedDiffProps } from './compound/git/UnifiedDiff'
export {
  default as GitFileRow,
  type GitFileEntryLike,
  type GitFileRowProps,
} from './compound/git/GitFileRow'
export {
  default as GitFileStatusIcon,
  type GitFileStatusIconProps,
} from './compound/git/GitFileStatusIcon'
export {
  GitFileChangesPills,
  type GitFileChangesPillsProps,
} from './compound/git/GitFileChangesPills'
export { default as CommitGraph, type CommitGraphProps } from './compound/git/CommitGraph'
export {
  default as GitCredentialErrorModal,
  type GitCredentialErrorModalProps,
  type GitCredentialErrorOp,
} from './compound/git/GitCredentialErrorModal'

// Tests screen compounds
export { default as CoverageTable, type CoverageTableProps } from './compound/tests/CoverageTable'
export {
  default as TestCustomConfigInput,
  type TestConfigCandidate,
  type TestConfigEnvVarLike,
  type TestCustomConfigInputProps,
} from './compound/tests/TestCustomConfigInput'
export {
  default as TestResultsList,
  type TestResultsListProps,
} from './compound/tests/TestResultsList'
export {
  default as TestsAggregateBar,
  type TestsAggregateBarProps,
} from './compound/tests/TestsAggregateBar'
export {
  default as TestsProgressBar,
  type TestsProgressBarProps,
} from './compound/tests/TestsProgressBar'
export type {
  CoverageFileStatsLike,
  CoverageResultLike,
  TestFailureLike,
  TestNameLike,
  TestResultLike,
  TestStatusLike,
  TestSummaryLike,
  TestsResultLike,
} from './compound/tests/types'

// Settings compounds
export {
  default as GitCredentialsForm,
  type GitCredentialsFormProps,
} from './compound/settings/GitCredentialsForm'
export {
  default as LLMConfigForm,
  type LLMConfigFormHandle,
  type LLMConfigFormMode,
  type LLMConfigFormProps,
} from './compound/settings/LLMConfigForm'
export {
  default as LLMProviderIcon,
  LLM_PROVIDER_STYLES,
  type LLMProviderIconProps,
  type LLMProviderId,
} from './compound/LLMProviderIcon'

// Tools screen compounds
export { default as ToolArgInput, type ToolArgInputProps } from './compound/tools/ToolArgInput'
export { default as ToolArgsForm, type ToolArgsFormProps } from './compound/tools/ToolArgsForm'
export { default as ToolListCard, type ToolListCardProps } from './compound/tools/ToolListCard'
export {
  default as ToolResultPanel,
  type ToolResultPanelProps,
  type ToolResultStatus,
} from './compound/tools/ToolResultPanel'

// Chat-view domain types (re-exported from headless for convenience)
export type {
  ChatContextLike,
  ChatLiveStateLike,
  ChatMessageLike,
  MessageUsageLike,
  PendingToolConfirmationLike,
  ToolCallLike,
  ToolResultLike,
  ToolResultTypeLike,
} from '../headless/utils/chatTypes'
