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
export { useProjectReferenceRenderer, useReferenceRenderer } from './hooks/useReferenceRenderer'
export { default as ReferenceRenderingProvider } from './compound/ReferenceRenderingProvider'

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
  default as FullScreenOverlay,
  type FullScreenOverlayProps,
} from './primitives/FullScreenOverlay'
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
export { TurnLimitField, type TurnLimitFieldProps } from './compound/TurnLimitField'
export {
  default as ProcessPipeline,
  type ProcessPipelineProps,
} from './compound/process/ProcessPipeline'
export { default as StepsStrip, type StepsStripProps } from './compound/process/StepsStrip'
export {
  default as ProcessRunChip,
  type ProcessRunChipProps,
} from './compound/process/ProcessRunChip'
export { default as ProcessesView } from './screens/ProcessesView'
export { default as ProcessRunsView, type ProcessRunsViewProps } from './screens/ProcessRunsView'
export {
  default as ProcessGroupRunsView,
  type ProcessGroupRunsViewProps,
} from './screens/ProcessGroupRunsView'
export {
  default as ProcessGroupPipeline,
  type ProcessGroupPipelineProps,
} from './compound/process/ProcessGroupPipeline'
export {
  default as ProcessGroupRunChip,
  type ProcessGroupRunChipProps,
} from './compound/process/ProcessGroupRunChip'
export {
  default as ProcessGroupParkReview,
  type ProcessGroupParkReviewProps,
} from './compound/process/ProcessGroupParkReview'
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
  FeatureRequestCard,
  type FeatureRequestCardData,
  type FeatureRequestCardProps,
  type FeatureRequestCardStatus,
} from './compound/FeatureRequestCard'
export {
  default as FeatureRequestBriefCard,
  type FeatureRequestBriefCardProps,
} from './compound/FeatureRequestBriefCard'
export {
  default as FeatureRequestDecision,
  type FeatureRequestDecisionProps,
} from './compound/FeatureRequestDecision'
export {
  default as FeatureRequestFullView,
  type FeatureRequestFullViewProps,
} from './compound/FeatureRequestFullView'
export {
  default as IncomingFeatureRequestCard,
  FeatureRequestProvenance,
  type IncomingFeatureRequestCardProps,
} from './compound/IncomingFeatureRequestCard'
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
export { default as ToneBadge, type ToneBadgeProps } from './compound/chips/ToneBadge'
export { default as DurationChip, type DurationChipProps } from './compound/chips/DurationChip'
export { default as ProjectChip, type ProjectChipProps } from './compound/chips/ProjectChip'
export {
  default as StatusChip,
  type ChipState,
  type StatusChipProps,
} from './compound/chips/StatusChip'
export { default as TurnChip, type TurnChipProps } from './compound/chips/TurnChip'
export { default as CheckChip, type CheckChipProps } from './compound/chips/CheckChip'
export { default as HandoffButton, type HandoffButtonProps } from './compound/chips/HandoffButton'
export {
  default as SetUpWithAgentButton,
  type SetUpWithAgentButtonProps,
} from './compound/chips/SetUpWithAgentButton'
export { default as HelpChip, type HelpChipProps } from './compound/chips/HelpChip'
export { default as RefChip, type RefChipKind, type RefChipProps } from './compound/chips/RefChip'
export { default as CommitChip, type CommitChipProps } from './compound/chips/CommitChip'
export {
  default as CommitChipBase,
  CommitCard,
  type CommitCardProps,
  type CommitChipBaseProps,
} from './compound/chips/CommitChipBase'
export { CommitOpenerProvider, useCommitOpener } from './compound/chips/CommitOpenerContext'
export type { CommitOpener } from './compound/chips/commitOpenerTypes'
export { default as ReferenceChip, type ReferenceChipProps } from './compound/chips/ReferenceChip'
export {
  default as ReferencePreviewSheet,
  type ReferencePreviewSheetProps,
} from './compound/chips/ReferencePreviewSheet'
export {
  default as RunReferenceChip,
  type RunReferenceChipProps,
} from './compound/chips/RunReferenceChip'
export {
  default as RunActionButton,
  type RunActionButtonProps,
} from './compound/chips/RunActionButton'
export {
  default as DependencyBullet,
  type DependencyBulletProps,
  type DependencyCardShape,
  type ResolvedDependency,
} from './compound/stories/DependencyBullet'
export { default as DependencyRef, type DependencyRefProps } from './compound/stories/DependencyRef'
export {
  default as ExclamationChip,
  type ExclamationChipProps,
} from './compound/stories/ExclamationChip'
export {
  default as FeatureKindChip,
  type FeatureKindChipProps,
} from './compound/stories/FeatureKindChip'
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
  default as ReferenceTextarea,
  type ReferenceTextareaProps,
} from './compound/files/ReferenceTextarea'
export {
  default as GroupHome,
  type GroupHomeProjectCard,
  type GroupHomeProps,
} from './compound/GroupHome'
export { default as BottomSheet, type BottomSheetProps } from './primitives/BottomSheet'
export { default as ChatBody, type ChatBodyProps } from './compound/chat/ChatBody'
export type { NativeAttachmentImages } from './compound/chat/chatNativeTypes'
export {
  default as PendingMessagesStack,
  type PendingMessagesStackProps,
} from './compound/chat/PendingMessagesStack'
export {
  default as CliRunArtifactPanel,
  type CliRunArtifactPanelProps,
} from './compound/chat/CliRunArtifactPanel'
export { ChatChangesBar, type ChatChangesBarProps } from './compound/chat/ChatChangesBar'
export {
  ChatChangesBarConnected,
  type ChatChangesBarConnectedProps,
} from './compound/chat/ChatChangesBarConnected'
export { ChatChangesMarker, type ChatChangesMarkerProps } from './compound/chat/ChatChangesMarker'
export {
  ChatChangesMarkerConnected,
  type ChatChangesMarkerConnectedProps,
} from './compound/chat/ChatChangesMarkerConnected'
export { ChatReviewScreen, type ChatReviewScreenProps } from './compound/chat/ChatReviewScreen'
export {
  ChatReviewScreenConnected,
  type ChatReviewScreenConnectedProps,
} from './compound/chat/ChatReviewScreenConnected'
export {
  default as EvidenceImageOverlay,
  type EvidenceImageOverlayProps,
} from './compound/chat/EvidenceImageOverlay'
export { default as ChatHeader, type ChatHeaderProps } from './compound/chat/ChatHeader'
export { default as ChatKindTile, type ChatKindTileProps } from './compound/chat/ChatKindTile'
export {
  default as ChatSettingsMenu,
  type ChatSettingsMenuProps,
} from './compound/chat/ChatSettingsMenu'
export { default as ChatNotifySettings } from './compound/settings/ChatNotifySettings'
export {
  default as ChatNotifyLevelPicker,
  type ChatNotifyLevelPickerProps,
} from './compound/chat/ChatNotifyLevelPicker'
export {
  default as AgentExchangeBlock,
  type AgentExchangeBlockProps,
} from './compound/chat/AgentExchangeBlock'
export {
  ManagerBriefCardView,
  ManagerCardView,
  ManagerEscalationCardView,
  ManagerOutcomeCardView,
  ManagerStopLine,
  type ManagerCardLinks,
} from './compound/chat/ManagerCards'
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
  default as AgentQuestionCard,
  type AgentQuestionCardProps,
} from './compound/chat/AgentQuestionCard'
export {
  default as CredentialCaptureCard,
  type CredentialCaptureCardProps,
} from './compound/chat/CredentialCaptureCard'
export { default as UsageModal, type UsageModalProps } from './compound/chat/UsageModal'
export {
  default as UsageModalConnected,
  type UsageModalConnectedProps,
} from './compound/chat/UsageModalConnected'
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
export { default as ChatStopCard, type ChatStopCardProps } from './compound/chat/ChatStopCard'
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
export { default as ChatDebugModal, type ChatDebugModalProps } from './compound/chat/ChatDebugModal'
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
export { default as NavIndicator, type NavIndicatorProps } from './compound/shell/NavIndicator'
export { default as InkBadge, type InkBadgeProps } from './compound/shell/InkBadge'
export { default as ScreenShell, type ScreenShellProps } from './compound/shell/ScreenShell'
export { default as LeaveGuard } from './compound/shell/LeaveGuard'

// Text / code viewers
export { default as Markdown, type MarkdownProps } from './compound/Markdown'
export { default as Code, type CodeProps } from './compound/Code'
export { TerminalOutput, type TerminalOutputProps } from './compound/TerminalOutput'
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
export {
  default as DragReorderList,
  type DragReorderListProps,
} from './compound/lists/DragReorderList'
export { default as FileTypeIcon, type FileTypeIconProps } from './compound/files/FileTypeIcon'
export {
  default as FilePaneHeader,
  type FilePaneHeaderProps,
} from './compound/files/FilePaneHeader'

// Search — a project's files, stories, features and notes in one search.
export {
  default as ProjectSearchView,
  type ProjectSearchViewProps,
} from './compound/search/ProjectSearchView'
// Design — a project's design files in miniature and full screen, the compare,
// its storage meter, and the chip a design reference renders as. The web view
// and PDF view come from the app through `DesignHostProvider`, so this barrel
// stays free of `react-native-webview`.
export { DesignHostProvider, useDesignHost } from './compound/design/DesignHostContext'
export type { DesignHost } from './compound/design/designNativeTypes'
export {
  default as DesignFileThumb,
  type DesignFileThumbProps,
} from './compound/design/DesignFileThumb'
export {
  default as DesignFileBody,
  type DesignFileBodyProps,
} from './compound/design/DesignFileBody'
export {
  default as DesignFileViewer,
  type DesignFileViewerProps,
} from './compound/design/DesignFileViewer'
export {
  default as DesignCompareOverlay,
  type DesignCompareOverlayProps,
  type DesignCompareSide,
} from './compound/design/DesignCompareOverlay'
export {
  default as DesignReferenceChip,
  type DesignReferenceChipProps,
} from './compound/design/DesignReferenceChip'
export {
  DesignStorageMeter,
  DesignStorageWarning,
  type DesignStorageMeterProps,
} from './compound/design/DesignStorageMeter'
export { default as StorageUsageRows } from './compound/design/StorageUsageRows'

// Git screen compounds
export { default as UnifiedDiff, type UnifiedDiffProps } from './compound/git/UnifiedDiff'
export {
  default as BinaryDiffView,
  type BinaryDiffViewProps,
  type BinaryDiffRecovery,
} from './compound/git/BinaryDiffView'
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
  default as MergeBranchSheet,
  type MergeBranchSheetProps,
} from './compound/git/MergeBranchSheet'
export {
  default as MergeInProgressBanner,
  type MergeInProgressBannerProps,
} from './compound/git/MergeInProgressBanner'
export {
  default as MergeOutcomeNotice,
  type MergeOutcomeNoticeProps,
} from './compound/git/MergeOutcomeNotice'
export {
  default as MergeChecksResult,
  type MergeChecksResultProps,
} from './compound/git/MergeChecksResult'
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

// Project compounds
export {
  default as ProjectGithubRepoField,
  type ProjectGithubRepoFieldProps,
} from './compound/projects/ProjectGithubRepoField'
export {
  default as TicketConnectionPicker,
  type TicketConnectionPickerProps,
  type TicketConnectionPickerValue,
} from './compound/projects/TicketConnectionPicker'
export {
  default as ProjectStableBranchField,
  type ProjectStableBranchFieldProps,
} from './compound/projects/ProjectStableBranchField'
export {
  default as SiblingFallbackNotice,
  RunSiblingFallbackNotice,
  type SiblingFallbackNoticeProps,
} from './compound/process/SiblingFallbackNotice'
export {
  default as ProjectTicketSettings,
  type ProjectTicketSettingsProps,
} from './compound/projects/ProjectTicketSettings'
export {
  default as GroupTicketSettings,
  type GroupTicketSettingsProps,
} from './compound/projects/GroupTicketSettings'
export {
  default as GithubConnectModal,
  type GithubConnectModalProps,
} from './compound/projects/GithubConnectModal'

// Settings compounds
export {
  default as ProjectNotesSettings,
  type ProjectNotesSettingsProps,
} from './compound/settings/ProjectNotesSettings'
export {
  default as GroupNotesSettings,
  type GroupNotesSettingsProps,
} from './compound/settings/GroupNotesSettings'
export {
  default as NotesSettings,
  type NotesSettingsProps,
} from './compound/settings/NotesSettings'
export { default as UsageSettings } from './compound/settings/UsageSettings'
export {
  default as UsageSettingsView,
  type UsageSettingsViewProps,
} from './compound/settings/UsageSettingsView'
export {
  default as BadgeSettings,
  type BadgeSettingsProps,
} from './compound/settings/BadgeSettings'
export {
  default as ProjectNotesForm,
  type ProjectNotesFormProps,
  type ProjectNotesFormMode,
} from './compound/settings/ProjectNotesForm'
export {
  default as GitCredentialsForm,
  type GitCredentialsFormProps,
} from './compound/settings/GitCredentialsForm'
export {
  default as ProviderConnectionsForm,
  type ProviderConnectionsFormProps,
} from './compound/settings/ProviderConnectionsForm'
export {
  default as ImportTicketsModal,
  type ImportTicketsModalProps,
} from './compound/settings/ImportTicketsModal'
export {
  default as LLMConfigForm,
  type LLMConfigFormHandle,
  type LLMConfigFormMode,
  type LLMConfigFormProps,
} from './compound/settings/LLMConfigForm'
export { default as CliConfigForm } from './compound/settings/CliConfigForm'
export {
  default as CliAddCredentialForm,
  type CliAddCredentialFormProps,
} from './compound/settings/CliAddCredentialForm'
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
  PendingQuestionGrant,
  PendingToolGrant,
  ToolCallLike,
  ToolResultLike,
  ToolResultTypeLike,
} from '../headless/utils/chatTypes'

// Template picker — native peer of the matching web compound. Same prop API.
//
export {
  default as AppWorkStartSheet,
  type AppWorkStartSheetProps,
} from './compound/AppWorkStartSheet'
export {
  default as LiveDataTaskSourceFields,
  type LiveDataTaskSourceFieldsProps,
} from './compound/LiveDataTaskSourceFields'
// `ProjectAppView` is **deliberately not exported here**. It depends on
// `react-native-webview` (an optional peer), and a top-level barrel
// export would force every native consumer to install + build the native
// binary for that package — crashing at module init otherwise. Import it
// from the dedicated subpath instead: `thefactory-ui/native/ProjectAppView`.
export { default as TemplatePicker, type TemplatePickerProps } from './compound/TemplatePicker'
export {
  default as SavedRulesSettings,
  type SavedRulesSettingsProps,
} from './compound/rules/SavedRulesSettings'
export {
  default as ChatRulesPanel,
  type ChatRulesPanelProps,
} from './compound/rules/ChatRulesPanel'
export { default as ActionRuleRow, type ActionRuleRowProps } from './compound/rules/ActionRuleRow'
export {
  default as AlwaysAllowControl,
  type AlwaysAllowControlProps,
} from './compound/chat/AlwaysAllowControl'
export {
  default as StoryNotesSection,
  type StoryNotesSectionProps,
} from './compound/stories/StoryNotesSection'
export {
  default as ProcessCleanupCard,
  type ProcessCleanupCardProps,
} from './compound/process/signoff/ProcessCleanupCard'
export { default as ChatList, type ChatListProps } from './compound/chat/ChatList'
export {
  default as AssistantConversationList,
  type AssistantConversationListProps,
} from './compound/chat/AssistantConversationList'
export {
  default as WorkLaunchChooser,
  type WorkLaunchChooserProps,
} from './compound/WorkLaunchChooser'
export {
  default as StoryLaunchDock,
  type StoryLaunchDockProps,
} from './compound/chat/StoryLaunchDock'
export {
  default as LaunchSuggestionPanel,
  type LaunchSuggestionPanelProps,
} from './compound/chat/LaunchSuggestionPanel'
export {
  default as StartWorkDialog,
  type StartWorkDialogProps,
} from './compound/chat/StartWorkDialog'
