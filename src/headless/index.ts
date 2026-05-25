// Public surface for @uikit/headless.
// React only — no DOM, no `window`, no RN.
export { useTypewriter } from './hooks/useTypewriter'
export { useDebouncedSetExit } from './hooks/useDebouncedSetExit'
export { useDurationTimer } from './hooks/useDurationTimer'
export {
  useDependencySelector,
  type FeatureLike,
  type StoryLike,
  type DependencySelectorOptions,
  type DependencyItem,
  type UseDependencySelector,
} from './hooks/useDependencySelector'
export {
  useFeatureForm,
  type FeatureFormInitialValues,
  type FeatureFormValues,
  type UseFeatureForm,
  type UseFeatureFormOptions,
} from './hooks/useFeatureForm'
export {
  useStoryForm,
  type StoryFormInitialValues,
  type StoryFormValues,
  type UseStoryForm,
  type UseStoryFormOptions,
} from './hooks/useStoryForm'
export {
  useBadgeCountsCore,
  ZERO_BADGE_COUNTS,
  type BadgeChannelToggles,
  type BadgeCounts,
  type BadgeChatInput,
  type BadgeGitInput,
  type ChatBadgeCountMode,
  type GitBadgeSubToggles,
  type UseBadgeCountsCoreInput,
} from './hooks/useBadgeCountsCore'
export {
  useResolvedTheme,
  type ResolvedTheme,
  type SystemThemeSource,
  type Theme,
  type UseResolvedThemeOptions,
} from './hooks/useResolvedTheme'
export { CodeBlockThemeProvider, useCodeBlockTheme } from './hooks/useCodeBlockTheme'
export {
  useChatLastRead,
  type ChatLastReadStore,
  type UseChatLastReadApi,
  type UseChatLastReadOptions,
} from './hooks/useChatLastRead'
export {
  useTooltipState,
  type UseTooltipState,
  type UseTooltipStateOptions,
} from './hooks/useTooltipState'
export { useStorageBackedState, type SyncKVStorage } from './hooks/useStorageBackedState'
export { useDirtyGuard, type UseDirtyGuard } from './hooks/useDirtyGuard'
export {
  useToastQueue,
  type ToastAction,
  type ToastItem,
  type ToastMessage,
  type ToastVariant,
  type UseToastQueue,
} from './hooks/useToastQueue'

// Chat-thinking helpers
export {
  computeThinkingKeys,
  computeChatKeyToProjectId,
  aggregateThinkingByProject,
  type ThinkingChatLike,
  type ThinkingChatsByProjectId,
} from './utils/chatThinking'

// Chat-unread helpers
export {
  assistantTimestamp,
  computeUnreadKeys,
  computeUnreadCounts,
  unreadCountForChat,
  type ChatLike,
  type UnreadChatMessageLike,
  type ChatsByProjectId,
  type UnreadCounts,
} from './utils/chatUnread'

// Badge aggregation
export {
  EMPTY_BADGE_STATE,
  aggregateGroupBadgeState,
  hasAnyBadge,
  type BadgeState,
} from './utils/badgeAggregation'

// Chat grouping for the Categories navigation view (topics + per-story buckets)
export {
  groupChats,
  type ChatFeatureGroup,
  type ChatStoryGroup,
  type GroupedChats,
} from './utils/chatGrouping'

// Tests format helpers — shared between web + native test viewers.
export {
  COVERAGE_IMPROVE_THRESHOLD,
  TEST_CONFIG_PATTERN,
  coverageBucket,
  formatUncoveredLines,
  getDirname,
  getFilename,
  isTestConfigPath,
  msToShort,
  normalizeRel,
  type CoverageBucket,
} from './utils/testsFormat'

// Git commit-graph topology — shared by web + native renderers.
export {
  LANE_COLORS,
  computeCommitGraph,
  type GitLogCommitLike,
  type GitLogRefLike,
  type GraphNode,
} from './utils/gitCommitGraph'

// Time / duration helpers
export {
  formatDate,
  formatDateShort,
  formatDateTime,
  formatDurationMs,
  formatFriendlyTimestamp,
  formatHmsCompact,
  formatTime,
  timeAgo,
} from './utils/time'

// Misc UI formatters
export { formatJson } from './utils/json'
export { maskSecret } from './utils/mask'

// Tool-call preview helpers — shared between web + native tool-preview
// renderers so a single source of truth governs extraction logic and the
// "what does this tool operate on" headline.
export {
  asArray,
  asRecord,
  buildUnifiedDiffIfPresent,
  extract,
  getToolHeaderPath,
  isCompletelyNewFile,
  isFilePathTool,
  looksLikeDiffPatchText,
  toLines,
  tryString,
} from './utils/toolPreview'

// Diff annotation — shared between web `StructuredUnifiedDiff` and native
// `UnifiedDiff` so both renderers stay 1:1 on `ignoreWhitespace` / `intra`.
export {
  annotateHunks,
  diffIntra,
  generateSelectedPatch,
  hunkLineRange,
  parseUnifiedDiffAnnotated,
  type DiffLineMarkupSegment,
  type IntraMode,
  type ParsedDiffHunk,
  type ParsedDiffLine,
} from './utils/diffAnnotate'

// Timeline / Gantt math — buckets, column math, story+feature event reducer.
export {
  buildColumns,
  buildYearGroups,
  bucketKey,
  bucketLabel,
  bucketStart,
  bucketStep,
  bucketYearLabel,
  columnIndex,
  computeWindow,
  groupEventsByStory,
  groupLabelsByBucket,
  storyEvents,
  storyEventsAcrossProjects,
  type Bucket,
  type StoryFeatureEvent,
  type TimelineColumn,
  type TimelineEvent,
  type TimelineStoryRow,
  type TimelineYearGroup,
} from './utils/timeline'

// Agent-run derivations
export {
  computeAgentRunUsage,
  computeCostUSD,
  computeRunDurations,
  type AgentRunLike,
  type AgentRunMessageLike,
  type AgentRunUsage,
  type LLMPriceLike,
} from './utils/agentRun'

// Story / feature status
export {
  STATUS_LABELS,
  STATUS_ORDER,
  statusKey,
  statusLabel,
  type StatusPickerValue,
  type StatusSemanticKey,
  type StoryStatus,
} from './utils/status'

// Story / feature list options (sorts + status filter) and the shared
// filter / sort operations both clients' list screens run on.
export {
  FEATURE_SORT_OPTIONS,
  STATUS_OPTIONS,
  STORY_SORT_OPTIONS,
  filterFeatures,
  filterStories,
  sortFeatures,
  sortStories,
  storyHasRejectedFeatures,
  type FeatureFilterOptions,
  type FeatureListSorting,
  type FeatureSortOptions,
  type StoryFilterOptions,
  type StoryListSorting,
  type StorySortOptions,
} from './utils/storiesOptions'

// Shell navigation model — shared structure for the web `Sidebar` / responsive
// drawer and the native `NavDrawer`.
export {
  GROUP_TAB_DEFS,
  SHELL_TAB_DEFS,
  groupTabToProjectTab,
  isGroupTabKey,
  isShellTabKey,
  projectTabToGroupTab,
  splitGroupsAndProjects,
  type GroupTabDef,
  type GroupTabKey,
  type NavGroupLike,
  type NavIconKey,
  type NavProjectLike,
  type ShellTabDef,
  type ShellTabKey,
  type SplitGroupsAndProjects,
} from './utils/shellNav'

// Persisted client settings (theme, shortcuts, notifications, ...)
// `Theme` and `ChatBadgeCountMode` are owned by their respective hook
// modules and re-exported above — not duplicated here.
export {
  AVAILABLE_THEMES,
  BADGE_COLORS,
  CODE_BLOCK_THEMES,
  DEFAULT_APP_SETTINGS,
  DEFAULT_NOTIFICATION_PREFS,
  DEFAULT_PROJECT_SETTINGS,
  DEFAULT_SHORTCUTS,
  type AppSettings,
  type BadgeColor,
  type CodeBlockTheme,
  type NotificationCategory,
  type NotificationPrefs,
  type ProjectSettings,
  type ShortcutsConfig,
  type ShortcutsModifier,
  type StoriesListSorting,
  type StoriesListStatusFilter,
  type StoriesViewMode,
  type UserPreferences,
} from './types/settings'
export { mergeSettings } from './utils/settings'

// Flat-path → directory-aware tree builder used by the FileTree compound on
// web + native. Cross-client lift from
// thefactory-overseer-web/src/core/files/fileTree.ts.
export {
  buildFileTree,
  filterFileTree,
  type DirNode,
  type FileNode,
  type TreeNode,
} from './utils/fileTree'

// Path / file-type helpers
export {
  extFromTypeOrName,
  formatBytes,
  formatFileDate,
  isTextLikeExt,
  splitPath,
} from './utils/path'

// Rich-text tokeniser (@file + #dep mentions)
export { tokenizeRichText, type RichTextSegment } from './utils/richTextTokenize'

// Chat system-prompt `{{placeholder}}` interpolation
export { interpolatePrompt, type PromptVariables } from './utils/promptInterpolate'

// Unified-diff parsing, patch utilities and the "create PR" URL builder are
// single-sourced in `thefactory-tools/utils` — import them from there
// (`parseUnifiedDiff`, `countPatchAddDel`, `generateHunkPatch`,
// `getFilePatch`, `getPRUrl`), not from this package.

// Raw project-file bytes endpoint (image / PDF / binary viewers)
export { rawFileUrl } from './utils/rawFileUrl'

// Tools screen — JSON-Schema accessors, value coercion, category grouping
export {
  coerceValue,
  getProperties,
  getRequired,
  groupByCategory,
  type ToolLike,
} from './utils/toolSchema'

// `@file` mention + `#dep` reference parsers (shared between web's
// `FileMentionsTextarea` and the native peer via `useFileMentions`).
export { applyMention, parseMention, rankMentionMatches, type MentionParse } from './utils/mention'
export {
  applyReference,
  parseReference,
  type ReferenceParse,
  type ReferenceSuggestion,
} from './utils/reference'

// `useFileMentions` — caret-tracking + accept-suggestion state machine
// consumed by web's `FileMentionsTextarea` and the native peer.
export {
  useFileMentions,
  type UseFileMentions,
  type UseFileMentionsOptions,
} from './hooks/useFileMentions'

// File-extension → renderer-kind classifier (markdown / html / image / pdf / text / binary).
export { classifyFileByExtension, type FilePaneKind } from './utils/filePaneKind'

// Chat-view domain types (shared between web and native chat compounds)
export type {
  ChatContextLike,
  ChatLiveStateLike,
  ChatMessageLike,
  MessageUsageLike,
  PendingToolConfirmationLike,
  ToolCallLike,
  ToolResultLike,
  ToolResultTypeLike,
} from './utils/chatTypes'

// Shared chat-title formatter — used by web / mobile / desktop chat-session
// headers so the title reads identically across all clients.
export { formatChatTitle, type ChatTitleInputs } from './utils/chatTitle'

// Backend API client (WsClient + SDK-independent error/helper utilities +
// auth / api context providers with adapter hooks for storage / SDK
// configuration). SDK-specific parts (generated hey-api client, test-run /
// coverage / grep helpers) lift here once codegen relocates from each
// consumer repo.
export {
  WsClient,
  type WsClientOptions,
  type WsConnectionState,
  type WsEventHandler,
} from './api/WsClient'
export { extractErrorMessage } from './api/errorMessage'
export {
  extractServerError,
  getResponseDataMessage,
  unwrapGitEnvelope,
  type ServerError,
} from './api/helpers'
export {
  AuthProvider,
  useAuth,
  type AuthContextValue,
  type AuthProviderProps,
  type TokenStorage,
} from './api/AuthContext'
export {
  ApiProvider,
  useApi,
  type ApiContextValue,
  type ApiProviderProps,
  type ConfigureBackendClientOptions,
} from './api/ApiContext'
