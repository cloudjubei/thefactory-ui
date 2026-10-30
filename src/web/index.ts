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
export { BottomSheet, type BottomSheetProps } from './primitives/BottomSheet'
export { FullScreenOverlay, type FullScreenOverlayProps } from './primitives/FullScreenOverlay'
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
export { TurnLimitField, type TurnLimitFieldProps } from './compound/TurnLimitField'
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
  default as DisconnectedBanner,
  type DisconnectedBannerProps,
} from './compound/DisconnectedBanner'
// `parseUnifiedDiff` / `generateHunkPatch` / `ParsedHunk` are owned by
// `thefactory-ui/headless` — import them from there, not the web barrel.
export {
  BinaryDiffView,
  DiffViewer,
  generateSelectedPatch,
  InlineTextDiff,
  SimpleSplitText,
  SimpleUnifiedDiff,
  StructuredUnifiedDiff,
  type BinaryDiffRecovery,
  type BinaryDiffViewProps,
  type DiffViewerProps,
  type IntraMode,
  type StructuredUnifiedDiffProps,
} from './compound/diff'
export {
  applyReference,
  FileDisplay,
  FileMentionsTextarea,
  FileMentionsTextareaConnected,
  classifyFileByExtension,
  FileInfoButton,
  FilePane,
  FilePaneHeader,
  FileSelector,
  HtmlEditor,
  FileTree,
  FileTypeIcon,
  ImageViewer,
  parseReference,
  PdfViewer,
  ReferenceTextarea,
  RichText,
  type FileDisplayProps,
  type FileInfoButtonProps,
  type FileInfoData,
  type FileMentionsTextareaProps,
  type FileMentionsTextareaConnectedProps,
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
  type PdfViewerProps,
  type ReferenceParse,
  type ReferenceSuggestion,
  type ReferenceTextareaProps,
  type RichTextProps,
  type UikitFileMeta,
} from './compound/files'
export {
  CheckChip,
  CommitCard,
  CommitChip,
  CommitChipBase,
  CostChip,
  DurationChip,
  HandoffButton,
  HelpChip,
  ProjectChip,
  RefChip,
  ReferenceChip,
  ReferencePreviewCard,
  RunActionButton,
  RunReferenceChip,
  SetUpWithAgentButton,
  StatusChip,
  StatusIcon,
  TurnChip,
  type CheckChipProps,
  type ChipState,
  type CommitCardProps,
  type CommitChipBaseProps,
  type CommitChipProps,
  type CostChipProps,
  type DurationChipProps,
  type HandoffButtonProps,
  type HelpChipProps,
  type ProjectChipProps,
  type RefChipKind,
  type RefChipProps,
  type ReferenceChipProps,
  type ReferencePreviewCardProps,
  type RunActionButtonProps,
  type RunReferenceChipProps,
  type SetUpWithAgentButtonProps,
  type StatusChipProps,
} from './compound/chips'
export {
  CommandPalette,
  type CommandPaletteItem,
  type CommandPaletteProps,
} from './compound/CommandPalette'
export {
  default as ContextMenu,
  type ContextMenuItem,
  type ContextMenuProps,
} from './compound/ContextMenu'
export {
  default as OverflowMenu,
  type OverflowMenuItem,
  type OverflowMenuProps,
} from './compound/OverflowMenu'
export {
  AgentRunBullet,
  AgentModelQuickSelect,
  AgentRunRowCard,
  type AgentRunBulletData,
  type AgentRunBulletProps,
  type AgentModelQuickSelectProps,
  type AgentRunRowCardData,
  type AgentRunRowCardProps,
  type ModelQuickSelectOption,
} from './compound/agents'
export { default as ErrorBubble, type ErrorBubbleProps } from './compound/ErrorBubble'
export {
  default as GroupHome,
  type GroupHomeProps,
  type GroupHomeProjectCard,
} from './compound/GroupHome'
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
export { TerminalOutput, type TerminalOutputProps } from './compound/TerminalOutput'
export { FeatureCard, type FeatureCardData, type FeatureCardProps } from './compound/FeatureCard'
export {
  StoryCard,
  type StoryCardData,
  type StoryCardProps,
  type StoryStatus,
} from './compound/StoryCard'
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
  OptionPicker,
  type OptionPickerProps,
  type OptionPickerOption,
} from './compound/OptionPicker'
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
  WarningChip,
  ExclamationChip,
  FeatureKindChip,
  ContextFileChip,
  ContextInfoButton,
  StoryAndFeatureCalloutBase,
  StoryAndFeatureCallout,
  StoryFormConnected,
  DependencyBulletBase,
  DependencyBullet,
  type WarningChipProps,
  type ExclamationChipProps,
  type FeatureKindChipProps,
  type ContextFileChipProps,
  type ContextInfoButtonProps,
  type StoryAndFeatureCalloutBaseProps,
  type StoryAndFeatureCalloutProps,
  type StoryFormConnectedProps,
  type DependencyBulletBaseProps,
  type DependencyBulletProps,
  type DependencyCardShape,
  type ResolvedDependency,
} from './compound/stories'
export { default as BlockersField, type BlockersFieldProps } from './compound/stories/BlockersField'
export {
  default as ProofPlanEditor,
  type ProofPlanEditorProps,
} from './compound/stories/ProofPlanEditor'
export { default as ScreenErrorBoundary } from './compound/shell/ScreenErrorBoundary'
export {
  default as ShellTabs,
  type ShellTabsProps,
  type TabDef as ShellTabsTabDef,
  type TabKey as ShellTabsTabKey,
} from './compound/shell/ShellTabs'
export { default as LoadingScreen, type LoadingScreenProps } from './compound/shell/LoadingScreen'
export { default as BackendStartupGate } from './compound/shell/BackendStartupGate'
export { default as RouterLeaveGuard } from './compound/shell/RouterLeaveGuard'
export { default as NavIndicator, type NavIndicatorProps } from './compound/shell/NavIndicator'
export { default as InkBadge, type InkBadgeProps } from './compound/shell/InkBadge'
export { default as UnifiedDiffView } from './compound/files/UnifiedDiffView'

// Project timeline (Gantt) — shared types, date / item utils, grid row,
// and the connected hover card.
export type {
  HoverInfo,
  RowDefinition,
  RowItem,
  TimelineLabel,
  TimestampContent,
  Unit,
  Zoom,
} from './compound/projectTimeline/ProjectTimelineTypes'
export {
  addDays,
  addMonths,
  addWeeks,
  clamp,
  diffInDays,
  diffInMonths,
  diffInWeeks,
  getUnitIndex,
  isoWeekNumber,
  startOfDay,
  startOfMonth,
  startOfWeek,
  tsToInput,
} from './compound/projectTimeline/timelineDateUtils'
export {
  ENTITY_TYPE,
  buildAllProjectsRows,
  buildLabelRows,
  getStoryCompletedAt,
  mapFeatureToTimelineLabel,
  mapStoryToTimelineLabel,
  normalizeLabels,
  storyColorStyles,
  type AllProjectsBuildInput,
} from './compound/projectTimeline/timelineItemUtils'
export { TimelineGridRow } from './compound/projectTimeline/TimelineGridRow'
export { TimelineHoverCard } from './compound/projectTimeline/TimelineHoverCard'

// Settings panels (connected to the lifted contexts).
export {
  default as VisualSettings,
  type VisualSettingsProps,
} from './compound/settings/VisualSettings'
export {
  default as BadgeSettings,
  type BadgeSettingsProps,
} from './compound/settings/BadgeSettings'
export { default as NotificationSettings } from './compound/settings/NotificationSettings'
export {
  default as BackendConnectionPanel,
  type BackendConnectionPanelProps,
} from './compound/settings/BackendConnectionPanel'
export { default as CrossProjectSettings } from './compound/settings/CrossProjectSettings'
export {
  default as ProjectOverviewModelField,
  type ProjectOverviewModelFieldProps,
} from './compound/settings/ProjectOverviewModelField'
export {
  default as SavedRulesSettings,
  type SavedRulesSettingsProps,
} from './compound/rules/SavedRulesSettings'
export {
  default as ChatRulesPanel,
  type ChatRulesPanelProps,
} from './compound/rules/ChatRulesPanel'
export { default as ActionRuleRow, type ActionRuleRowProps } from './compound/rules/ActionRuleRow'

// Shell-level connected components: command menu + shortcuts help overlay.
export { default as CommandMenu } from './compound/shell/CommandMenu'
export { default as ShortcutsHelp } from './compound/shell/ShortcutsHelp'

// Stories Kanban board.
export { default as BoardView, type BoardViewProps } from './compound/stories/BoardView'
export { default as RunAgentButton, type RunAgentButtonProps } from './compound/RunAgentButton'
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
export { UsageModal, type UsageModalProps } from './compound/UsageModal'
export {
  ModelChip,
  type ModelChipConfig,
  type ModelChipMode,
  type ModelChipProps,
} from './compound/ModelChip'
export {
  default as ModelChipConnected,
  type ModelChipConnectedProps,
} from './compound/ModelChipConnected'
export {
  default as LLMProviderIcon,
  LLM_PROVIDER_STYLES,
  type LLMProviderIconProps,
  type LLMProviderId,
} from './compound/LLMProviderIcon'
export {
  ChatSidebarPanel,
  type ChatSidebarPanelChildrenArgs,
  type ChatSidebarPanelProps,
} from './compound/ChatSidebarPanel'

export { default as ChatNotifySettings } from './compound/settings/ChatNotifySettings'
// A chat's "Notify me", the agents' own exchange drawn quietly, and the card a stop shows.
export {
  AgentExchangeBlock,
  ChatNotifyLevelPicker,
  ManagerBriefCardView,
  ManagerCardView,
  ManagerEscalationCardView,
  ManagerOutcomeCardView,
  ManagerStopLine,
  ChatStopCard,
  type AgentExchangeBlockProps,
  type ChatStopCardProps,
  type ChatNotifyLevelPickerProps,
  type ManagerCardLinks,
} from './compound/chat'

// Chat view (lifted from web + desktop's ChatView)
export {
  AgentQuestionCard,
  ChatBody,
  CliRunArtifactPanel,
  ChatChangesBar,
  type ChatChangesBarProps,
  ChatChangesBarConnected,
  type ChatChangesBarConnectedProps,
  ChatChangesMarker,
  type ChatChangesMarkerProps,
  ChatChangesMarkerConnected,
  type ChatChangesMarkerConnectedProps,
  ChatReviewPanel,
  type ChatReviewPanelProps,
  ChatReviewPanelConnected,
  type ChatReviewPanelConnectedProps,
  EvidenceImageOverlay,
  ChatDebugModal,
  ChatDynamicContextModal,
  ChatHeader,
  ChatKindTile,
  ChatSettingsMenu,
  ChatInput,
  ChatDropController,
  useChatDropTarget,
  PendingMessagesStack,
  type PendingMessagesStackProps,
  ChatSettingsDropdown,
  ChatTopicCreateModal,
  ChatTopicCreateModalConnected,
  CredentialCaptureCard,
  HistorySummarizationSettings,
  SystemPromptViewerConnected,
  UsageModalConnected,
  interpolatePrompt,
  MessageList,
  MessageRow,
  MessageSanitizationSettings,
  renderToolPreview,
  WriteToolsPreview,
  WriteMultiToolsPreview,
  StatusIcon as ChatToolStatusIcon,
  StatusPill as ChatToolStatusPill,
  SystemPromptBubble,
  SystemPromptViewerModal,
  ThinkingRow,
  ToolCallCard,
  ToolCallHoverCard,
  SendChatMessagePreview,
  SendChatMessageCard,
  type SendChatMessagePreviewProps,
  type SendChatMessageCardProps,
  type AgentQuestionCardProps,
  type ChatBodyProps,
  type ChatContextLike,
  type ChatHeaderProps,
  type ChatKindTileProps,
  type ChatSettingsMenuProps,
  type ChatInputProps,
  type ChatLiveStateLike,
  type ChatMessageLike,
  type ChatSettingsDropdownProps,
  type ChatTopicCreateModalProps,
  type ChatTopicCreateModalConnectedProps,
  type ChatDebugModalProps,
  type ChatDynamicContextModalProps,
  type CredentialCaptureCardProps,
  type SystemPromptViewerConnectedProps,
  type UsageModalConnectedProps,
  type CompletionSettingsLike,
  type MessageListProps,
  type MessageRowProps,
  type MessageUsageLike,
  type SystemPromptBubbleProps,
  type SystemPromptViewerModalProps,
  type ThinkingRowProps,
  type ToolCallCardProps,
  type ToolCallHoverCardProps,
  type ToolCallLike,
  type ToolResultLike,
  type ToolResultTypeLike,
  type ToolToggle,
  type PromptVariables,
  type HistorySummarization,
  type HistorySummarizationSettingsProps,
  type MessageSanitization,
  type MessageSanitizationSettingsProps,
  type RenderToolPreviewArgs,
  type StoryShape,
  type FeatureShape,
  type ToolPreview,
  type ToolPreviewHooks,
  type WriteToolsPreviewProps,
  type WriteMultiToolsPreviewProps,
} from './compound/chat'

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
  CheckoutDialog,
  CommitDialog,
  CommitDiffViewer,
  CreateBranchDialog,
  GitCommitGraph,
  GitCommitGraphHeader,
  GitCommitGraphRow,
  GitCredentialErrorModal,
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
  MergeBranchSheet,
  MergeConflictResolver,
  MergeDialog,
  MergeInProgressBanner,
  MergeOutcomeNotice,
  MergeChecksResult,
  StashDialog,
  computeCommitGraph,
  type CommitDialogProps,
  type CommitDiffFetcher,
  type CommitDiffViewerProps,
  type GitCommitGraphHeaderProps,
  type GitCommitGraphProps,
  type GitCommitGraphRowProps,
  type GitCredentialErrorModalProps,
  type GitCredentialErrorOp,
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
  type MergeBranchSheetProps,
  type MergeConflictResolverProps,
  type MergeDialogProps,
  type MergeInProgressBannerProps,
  type MergeOutcomeNoticeProps,
  type MergeChecksResultProps,
  type StashDialogProps,
} from './compound/git'

// Keyboard-shortcut provider — apps pass their `ShortcutsModifier` setting
// in; the provider owns the `window` keydown listener and dispatch.
export {
  ShortcutsProvider,
  useShortcuts,
  type Shortcut,
  type ShortcutHandler,
  type ShortcutsApi,
  type ShortcutsProviderProps,
} from './compound/shortcuts/ShortcutsContext'
export { ShortcutsProviderConnected } from './compound/shortcuts/ShortcutsProviderConnected'

// Browser-storage bindings + connected settings providers — the per-device
// `localStorage` adapter every browser client shares, plus the
// `AppSettings` / `LLMConfigs` providers pre-wired with it (and, for
// AppSettings, the platform-aware defaults). Read state via `useAppSettings`
// / `useLLMConfigs` from `thefactory-ui/headless`.
export { localStorageAdapter } from './compound/storage/localStorageAdapter'
export { subscribePageHidden } from './compound/storage/subscribePageHidden'
export { AppSettingsProviderConnected } from './compound/settings/AppSettingsProviderConnected'
export { LLMConfigsProviderConnected } from './compound/settings/LLMConfigsProviderConnected'

// Per-chat "last seen" timestamps for unread badges, localStorage-backed
// with cross-tab + same-document sync. Pure helpers (`isChatUnread`,
// `markSeen`, `ChatsSeenMap`) come from `thefactory-ui/headless`.
export {
  CHATS_SEEN_EVENT,
  readChatsSeen,
  useChatsSeen,
  writeChatsSeen,
} from './compound/notifications/chatsSeen'
export {
  useChatContextLastRead,
  type UseChatContextLastReadApi,
} from './compound/notifications/chatLastRead'
export { useAppTabLastOpened } from './compound/notifications/appLastOpened'

// Utils
export { cn } from './utils/cn'
export { playBeep } from './utils/beep'
export {
  arrayBufferToBase64,
  detectUploadEncoding,
  type UploadEncoding,
} from './utils/uploadEncoding'
// Projects-related connected components (group editor, code-info modal, editor form).
export { default as ProjectGroupsEditor } from './compound/projects/ProjectGroupsEditor'
export {
  default as ProjectGithubRepoField,
  type ProjectGithubRepoFieldProps,
} from './compound/projects/ProjectGithubRepoField'
export {
  default as GithubConnectModal,
  type GithubConnectModalProps,
} from './compound/projects/GithubConnectModal'
export {
  default as ProjectCodeInfoModal,
  type CodeInfoValue,
} from './compound/projects/ProjectCodeInfoModal'
export {
  ProjectEditorForm,
  blankProjectForm,
  projectToFormState,
  type ProjectEditorFormProps,
  type ProjectFormState,
} from './compound/projects/ProjectEditorForm'
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
  default as ProjectCheckEnvField,
  type ProjectCheckEnvFieldProps,
} from './compound/projects/ProjectCheckEnvField'
export {
  default as ProjectEvaluationDefaultsField,
  type ProjectEvaluationDefaultsFieldProps,
} from './compound/projects/ProjectEvaluationDefaultsField'
export {
  default as EvaluationLaunchAskBody,
  type EvaluationLaunchAskBodyProps,
} from './compound/chat/EvaluationLaunchAskBody'
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
  default as AgentTypeSettings,
  type AgentTypeSettingsProps,
} from './compound/settings/AgentTypeSettings'
export {
  default as AgentTypeSettingsPanel,
  type AgentTypeSettingsPanelProps,
} from './compound/settings/AgentTypeSettingsPanel'
export {
  default as AgentTypeSlotChooser,
  type AgentTypeSlotChooserProps,
} from './compound/chat/AgentTypeSlotChooser'

// Settings panels — all wired to the lifted headless contexts.
export {
  default as DataLocationPanel,
  type DataLocation,
} from './compound/settings/DataLocationPanel'
export { default as DataLocationSettingsPanel } from './compound/settings/DataLocationSettingsPanel'
export { default as DatabaseSettings } from './compound/settings/DatabaseSettings'
export { default as GitCredentialsForm } from './compound/settings/GitCredentialsForm'
export type {
  GitCredentialsFormProps,
  GitCredentialsFormHostCapabilities,
} from './compound/settings/GitCredentialsForm'
export { default as GitCredentialsSettings } from './compound/settings/GitCredentialsSettings'
export type { GitCredentialsSettingsProps } from './compound/settings/GitCredentialsSettings'
export { default as ProjectNotesSettings } from './compound/settings/ProjectNotesSettings'
export type { ProjectNotesSettingsProps } from './compound/settings/ProjectNotesSettings'
export {
  default as ProjectKnowledgeView,
  type ProjectKnowledgeViewProps,
} from './compound/knowledge/ProjectKnowledgeView'
export {
  default as ProjectKnowledgeViewConnected,
  type ProjectKnowledgeViewConnectedProps,
} from './compound/knowledge/ProjectKnowledgeViewConnected'
// Search — a project's files, stories, features and notes in one search.
export {
  default as ProjectSearchView,
  type ProjectSearchViewProps,
} from './compound/search/ProjectSearchView'
// Design — a project's screens and components, states, versions, proposals and
// tidy-up plans; storage usage.
export { default as DesignView, type DesignViewProps } from './compound/design/DesignView'
export {
  default as DesignFileViewer,
  type DesignFileViewerProps,
} from './compound/design/DesignFileViewer'
export {
  default as DesignFileThumb,
  type DesignFileThumbProps,
} from './compound/design/DesignFileThumb'
export {
  default as DesignReferenceChip,
  type DesignReferenceChipProps,
} from './compound/design/DesignReferenceChip'
export { default as StorageUsageSettings } from './compound/settings/StorageUsageSettings'
export { default as UsageSettings } from './compound/settings/UsageSettings'
export {
  default as UsageSettingsView,
  type UsageSettingsViewProps,
} from './compound/settings/UsageSettingsView'
export { default as GroupNotesSettings } from './compound/settings/GroupNotesSettings'
export type { GroupNotesSettingsProps } from './compound/settings/GroupNotesSettings'
export { default as NotesSettings } from './compound/settings/NotesSettings'
export type { NotesSettingsProps } from './compound/settings/NotesSettings'
export { default as ProjectNotesForm } from './compound/settings/ProjectNotesForm'
export type {
  ProjectNotesFormProps,
  ProjectNotesFormMode,
} from './compound/settings/ProjectNotesForm'
export { default as ProviderConnectionsSettings } from './compound/settings/ProviderConnectionsSettings'
export { default as ProviderConnectionsForm } from './compound/settings/ProviderConnectionsForm'
export type { ProviderConnectionsFormProps } from './compound/settings/ProviderConnectionsForm'
export { default as ImportTicketsModal } from './compound/settings/ImportTicketsModal'
export type { ImportTicketsModalProps } from './compound/settings/ImportTicketsModal'
export { default as IngestionPanel } from './compound/settings/IngestionPanel'
export { default as OverseerPanel } from './compound/settings/OverseerPanel'
export { default as WebSearchSettings } from './compound/settings/WebSearchSettings'
export {
  default as LLMConfigForm,
  type LLMConfigFormHandle,
  type LLMConfigFormProps,
} from './compound/settings/LLMConfigForm'
export { default as CliConfigForm } from './compound/settings/CliConfigForm'
export {
  default as CliAddCredentialForm,
  type CliAddCredentialFormProps,
} from './compound/settings/CliAddCredentialForm'

// Shell-level overlay
export { default as DiagnosticsOverlay } from './compound/shell/DiagnosticsOverlay'

// Top-level screens shared by web + desktop (mobile renders its own
// native equivalents).
export { default as WelcomeView } from './screens/WelcomeView'
export { default as ProjectTimelineView } from './screens/ProjectTimelineView'
export { default as ProcessesView } from './screens/ProcessesView'
export { default as ProcessRunsView, type ProcessRunsViewProps } from './screens/ProcessRunsView'
export {
  default as ProcessPipeline,
  type ProcessPipelineProps,
} from './compound/process/ProcessPipeline'
export {
  default as SignoffReportPanel,
  type SignoffReportPanelProps,
} from './compound/process/signoff/SignoffReportPanel'
export { default as StepsStrip, type StepsStripProps } from './compound/process/StepsStrip'
export { default as HeaderBar, type HeaderBarProps } from './compound/HeaderBar'
export { default as ToneBadge, type ToneBadgeProps } from './compound/chips/ToneBadge'
export {
  default as ProcessRunChip,
  type ProcessRunChipProps,
} from './compound/process/ProcessRunChip'
export {
  default as ProcessGroupRunsView,
  type ProcessGroupRunsViewProps,
} from './screens/ProcessGroupRunsView'
export {
  default as ProcessGroupPipeline,
  type ProcessGroupPipelineProps,
} from './compound/process/ProcessGroupPipeline'
export {
  default as ProcessGroupRunChatButton,
  type ProcessGroupRunChatButtonProps,
} from './compound/process/ProcessGroupRunChatButton'
export {
  default as GroupStoriesList,
  type GroupStoriesListProps,
} from './compound/groupStories/GroupStoriesList'
export {
  default as GroupStoryPage,
  type GroupStoryPageProps,
} from './compound/groupStories/GroupStoryPage'
export {
  GroupStoryFormDialog,
  GroupStoryFormFields,
  type GroupStoryFormDialogProps,
  type GroupStoryFormProps,
} from './compound/groupStories/GroupStoryForm'
export {
  default as GroupStoryRunDialog,
  type GroupStoryRunDialogProps,
  type GroupStoryRunStarted,
} from './compound/groupStories/GroupStoryRunDialog'
export {
  default as PartOfGroupStoryChip,
  type PartOfGroupStoryChipProps,
} from './compound/groupStories/PartOfGroupStoryChip'
export {
  GroupStoryRunStatus,
  GroupStoryStoryChip,
  GroupStoryToneBadge,
} from './compound/groupStories/GroupStoryBits'
export {
  GroupStoriesScreen,
  GroupStoryScreen,
  type GroupStoriesScreenProps,
  type GroupStoryScreenProps,
} from './compound/groupStories/GroupStoryScreens'
export {
  default as ProcessGroupRunChip,
  type ProcessGroupRunChipProps,
} from './compound/process/ProcessGroupRunChip'
export {
  default as ProcessGroupParkReview,
  type ProcessGroupParkReviewProps,
} from './compound/process/ProcessGroupParkReview'
export {
  default as GithubCallback,
  GITHUB_OAUTH_MESSAGE_TYPE,
  GITHUB_TOKEN_STORAGE_KEY,
  GITHUB_CREDENTIAL_STORAGE_KEY,
  GITHUB_GITCRED_SCOPE_LABEL_STORAGE_KEY,
  type GithubOAuthMessage,
  type GithubOAuthResult,
} from './screens/GithubCallback'

// Overseer Git surface — read-only view + settings-panel entry point.
// Both shipped from `thefactory-ui/web` so web and desktop render the
// same screen; the host only owns the route + back-nav wiring (`onBack`).
export { default as OverseerGitView, type OverseerGitViewProps } from './screens/OverseerGitView'
export {
  default as OverseerGitPanel,
  type OverseerGitPanelProps,
} from './compound/settings/OverseerGitPanel'

// React hooks for `window.localStorage`-backed state. Used by resizable
// pane splits and collapsible-sidebar toggles across web + desktop.
export { useLocalStorageNumber, useLocalStorageBool } from './hooks/useLocalStorage'
export { useProjectSettingsConnected } from './hooks/useProjectSettingsConnected'
export {
  useWebNotifications,
  type NotificationPermissionState,
  type WebNotificationsApi,
} from './hooks/useWebNotifications'

// `useIsNarrowViewport` — Tailwind `md`-breakpoint media query as a hook.
// Drives the narrow / master-detail layout switches in `CommitDiffViewer`
// and any other layout that flips at the same width.
export { useIsNarrowViewport } from './hooks/useIsNarrowViewport'
// `useDragReorder` — drag a list's rows to reorder them, beside the row dropped on.
export { useDragReorder } from './hooks/useDragReorder'
export type { DragReorder, DragReorderOptions, DragReorderRowProps } from './hooks/useDragReorder'
export { useProjectReferenceRenderer, useReferenceRenderer } from './hooks/useReferenceRenderer'
export { default as ReferenceRenderingProvider } from './compound/ReferenceRenderingProvider'

// App-view surface (iframe) + template picker for the from-template
// wizard. Headless data + scheduling live in `useProjectAppView` and
// `TemplatesContext` respectively.
export { default as ProjectAppView, type ProjectAppViewProps } from './compound/ProjectAppView'
export {
  default as AppWorkStartDialog,
  type AppWorkStartDialogProps,
} from './compound/AppWorkStartDialog'
export {
  default as AppFeatureRequestDialog,
  type AppFeatureRequestDialogProps,
} from './compound/AppFeatureRequestDialog'
export {
  default as LiveDataTaskSourceFields,
  type LiveDataTaskSourceFieldsProps,
} from './compound/LiveDataTaskSourceFields'
export { default as TemplatePicker, type TemplatePickerProps } from './compound/TemplatePicker'
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
