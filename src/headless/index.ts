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

// Time / duration helpers
export {
  formatDate,
  formatDurationMs,
  formatFriendlyTimestamp,
  formatHmsCompact,
  formatTime,
  timeAgo,
} from './utils/time'

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

// Path / file-type helpers
export {
  extFromTypeOrName,
  formatBytes,
  formatFileDate,
  isTextLikeExt,
  splitPath,
} from './utils/path'

// Rich-text tokeniser (@file + #dep mentions)
export {
  tokenizeRichText,
  type RichTextSegment,
} from './utils/richTextTokenize'

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

// Backend API client (WsClient + SDK-independent error/helper utilities).
// SDK-specific parts (generated hey-api client, test-run / coverage / grep
// helpers) lift here once codegen relocates from each consumer repo.
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
