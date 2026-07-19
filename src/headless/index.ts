// Public surface for @uikit/headless.
// React only — no DOM, no `window`, no RN.
export { useTypewriter } from './hooks/useTypewriter'
export {
  useSpeechToText,
  SpeechToTextEngineContext,
  type SpeechToTextEngine,
  type SpeechToTextStatus,
  type UseSpeechToText,
} from './hooks/useSpeechToText'
export {
  useNativeDictationTrigger,
  NativeDictationTriggerContext,
  type NativeDictationTrigger,
  type NativeDictationResult,
  type NativeDictationFailureReason,
} from './hooks/useNativeDictationTrigger'
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
  type BadgeActivityInput,
  type ChatBadgeCountMode,
  type GitBadgeSubToggles,
  type UseBadgeCountsCoreInput,
} from './hooks/useBadgeCountsCore'
export {
  useProjectActivities,
  useSeedActivities,
  type ProjectActivitiesState,
} from './hooks/useProjectActivities'
export {
  useCrossProjectRequests,
  type CrossProjectRequestsState,
} from './hooks/useCrossProjectRequests'
export { crossProjectNotification, type CrossProjectNotification } from './utils/crossProjectNotify'
export {
  summarizeCrossProjectWaiting,
  type CrossProjectWaitingRequest,
  type CrossProjectWaitingItem,
  type CrossProjectWaitingTone,
  type CrossProjectWaitingView,
} from './utils/crossProjectWaiting'
export {
  useCrossProjectSettings,
  type CrossProjectSettingsState,
} from './hooks/useCrossProjectSettings'
export {
  isAcceptanceMode,
  readAcceptanceLayer,
  resolveAcceptance,
} from './utils/crossProjectSettings'
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
  useAppLastOpened,
  type AppLastOpenedStore,
  type UseAppLastOpenedApi,
} from './hooks/useAppLastOpened'
export {
  useTooltipState,
  type UseTooltipState,
  type UseTooltipStateOptions,
} from './hooks/useTooltipState'
export { useStorageBackedState, type SyncKVStorage } from './hooks/useStorageBackedState'
export { useProjectSettings, type ProjectSettingsApi } from './hooks/useProjectSettings'
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

// Chat-row status — single computation shared by web's `ChatsNavigationSidebar`
// and mobile's `ChatRow`. Each host wraps it in a thin hook that supplies
// `chat` + `isSending` (from `useChats`) and `seen` (from `useChatsSeen`).
export {
  computeChatRowStatus,
  isChatUnread,
  markSeen,
  type ChatRowStatus,
  type ChatsSeenMap,
} from './utils/chatRowStatus'

// Badge aggregation
export {
  EMPTY_BADGE_STATE,
  aggregateGroupBadgeState,
  formatBadgeCount,
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

// Per-project tri-state override resolver (notification categories, badges)
export { resolveTriState } from './utils/triState'

// Keyboard-shortcut combo parsing + matching + pretty-printing.
// `Mod` resolves to ⌘ or Ctrl based on the consumer's `ShortcutsModifier`.
export { comboMatches, prettyCombo } from './utils/comboMatcher'

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
  selectionKeysForLineRange,
  type DiffLineMarkupSegment,
  type IntraMode,
  type ParsedDiffHunk,
  type ParsedDiffLine,
} from './utils/diffAnnotate'

// Working-tree "Local Changes" pane selection bookkeeping — shared by web +
// desktop so fully staging/unstaging a file advances to the next file 1:1.
export {
  localChangesKey,
  localChangesRangeKeys,
  nextLocalChangesSelection,
  type ChangesArea,
  type ChangesAreaKey,
} from './utils/localChangesSelection'
export {
  useLocalChangesSelection,
  type LocalChangesPrimary,
  type UseLocalChangesSelection,
} from './hooks/useLocalChangesSelection'

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
  BADGE_COLOR_CATEGORIES,
  BADGE_COLORS,
  CODE_BLOCK_THEMES,
  DEFAULT_APP_SETTINGS,
  DEFAULT_NOTIFICATION_PREFS,
  DEFAULT_PROJECT_SETTINGS,
  DEFAULT_SHORTCUTS,
  isBadgeColorCategory,
  type AppSettings,
  type BadgeColor,
  type BadgeColorCategory,
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
export {
  interpolatePrompt,
  interpolateChatSystemPrompt,
  buildChatPromptVariables,
  type PromptVariables,
} from './utils/promptInterpolate'

// Pure git/diff helpers single-sourced in `thefactory-tools/utils`, re-exported
// here so apps consume them through `thefactory-ui` rather than importing
// `thefactory-tools` directly (see ARCHITECTURE.md). The `chatKey` derivation
// remains the sole sanctioned direct-from-`thefactory-tools` app import.
export {
  parseUnifiedDiff,
  countPatchAddDel,
  generateHunkPatch,
  getFilePatch,
  getPRUrl,
  mergeUnstagedWithUntracked,
} from 'thefactory-tools/utils'

// Raw project-file bytes endpoint (image / PDF / binary viewers)
export { rawFileUrl } from './utils/rawFileUrl'
export { persistAppDataCapabilities } from './utils/dataCapabilities'
export {
  appDeepLinkFromParams,
  serializeAppDeepLink,
  shouldPushDeepLink,
  type AppDeepLink,
} from './utils/appDeepLink'
export { resolveResourceNav, type ResourceNav } from './utils/resourceNav'
export { toolResultResourceLinks, type ToolResultLink } from './utils/toolResultLinks'
export type { ResourceLink } from 'thefactory-tools/types'

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
  PendingToolGrant,
  PendingToolGrantData,
  PendingToolGrantDecision,
  PendingToolGrantSource,
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

// Chats context factory + pre-bound `ChatsProvider` / `useChats` pair —
// single source of truth for chat orchestration shared by web + mobile +
// desktop. The pre-bound version uses the headless `useLLMConfigs` /
// `useActiveProject` so a single shared instance is identical across all
// clients; the factory is still exported for tests / future divergence.
export {
  ChatsProvider,
  useChats,
  createChatsContext,
  type ChatLiveState,
  type ChatSettingsPatch,
  type ChatsContextValue,
  type CreateChatsContextDeps,
  type PendingToolConfirmation,
} from './contexts/createChatsContext'

// App settings (theme, shortcuts, notification prefs) backed by an
// app-provided `SyncKVStorage`. The provider takes an optional `defaults`
// prop so apps can supply platform-aware first-launch values (e.g. the
// mac-aware `Mod` key) without re-implementing the rest of the provider.
export {
  AppSettingsProvider,
  useAppSettings,
  type AppSettingsContextValue,
  type AppSettingsProviderProps,
} from './contexts/AppSettingsContext'

// LLM cost aggregation per chat — TTL-cached + de-duped fetcher shared by
// all clients' usage / cost views.
export { CostsProvider, useCosts, type CostsContextValue } from './contexts/CostsContext'

// LLM provider configs (create / update / delete + per-purpose active +
// recents) backed by an app-provided `SyncKVStorage` for the active /
// recents persistence.
export {
  LLMConfigsProvider,
  useLLMConfigs,
  type ActivityCliModel,
  type LLMConfigsContextValue,
  type LLMConfigsProviderProps,
} from './contexts/LLMConfigsContext'

// CLI agent configs (auth-cache CRUD + active CLI/credential + per-CLI enabled
// set + login lifecycle + model/live probes), the CLI analogue of LLMConfigs.
export {
  CliConfigsProvider,
  useCliConfigs,
  type CliConfigsContextValue,
  type CliConfigsProviderProps,
  type CliLiveProbeResult,
  type CliLiveModelsResult,
  type CliProbeResult,
  type CliAuthLoginResult,
} from './contexts/CliConfigsContext'

// Per-chat CLI-runner binding (attach / detach) + the unified tool-grant queue
// (API require_confirmation + CLI gated PendingActions) the confirmation UI renders.
export { useChatCliRunner, type UseChatCliRunner } from './hooks/useChatCliRunner'
export { useActivityChipCli, type ActivityChipCliWiring } from './hooks/useActivityChipCli'
export { useAgentRunChipCli, type AgentRunChipCliWiring } from './hooks/useAgentRunChipCli'
export { useCliRunArtifact, type UseCliRunArtifact } from './hooks/useCliRunArtifact'
export { usePendingToolGrants, type UsePendingToolGrants } from './hooks/usePendingToolGrants'

// Git credentials (HTTPS PATs / SSH keys) CRUD.
export {
  GitCredentialsProvider,
  useGitCredentials,
  type GitCredentialsContextValue,
} from './contexts/GitCredentialsContext'

// Provider connections (Jira / GitHub Issues / … ticket providers) CRUD + the
// B3 connectors: list assigned items + import a ticket into a project as a Story.
export {
  ProviderConnectionsProvider,
  useProviderConnections,
  type ProviderConnectionsContextValue,
  type ProviderConnectionEditInput,
} from './contexts/ProviderConnectionsContext'

// Project groups (MAIN exclusive + SCOPE overlapping) — sidebar / nav source
// of truth across clients. Listens to the `projectsGroups:updated` WS topic.
export {
  ProjectsGroupsProvider,
  useProjectsGroups,
  type GroupType,
  type ProjectsGroup,
  type ProjectsGroupsContextValue,
} from './contexts/ProjectsGroupsContext'

// The "overseer" — central / config-repo state (remote URL, setup status).
// Listens to the `overseer:updated` WS topic.
export {
  OverseerProvider,
  useOverseer,
  type OverseerContextValue,
} from './contexts/OverseerContext'

// Projects list + active project selection. Persists the active id via
// `useAppSettings().userPreferences.lastActiveProjectId` so the headless
// `AppSettingsProvider` must be mounted above this one.
export {
  ProjectsProvider,
  useActiveProject,
  useProjects,
  type ProjectsContextValue,
} from './contexts/ProjectsContext'

// Catalog of project templates the user can fork from. Bundles the
// `createFromTemplate` mutation alongside the catalog read — matches the
// `LLMConfigsContext.createConfig` pattern of co-locating mutations with
// their list. Requires `AuthProvider` + `ApiProvider` above.
export {
  TemplatesProvider,
  useTemplates,
  type Template,
  type TemplatesContextValue,
  type CreateFromTemplateInput,
} from './contexts/TemplatesContext'

// App-view URL + signed-token refresh for one project. Standalone hook
// (no context) because the surface is per-project; bundling it into
// `ProjectsContext` would couple the catalog to a per-project transport.
export { useProjectAppView, type UseProjectAppView } from './hooks/useProjectAppView'
export { useProjectData, type UseProjectData } from './hooks/useProjectData'
export { useProjectDataBridge } from './hooks/useProjectDataBridge'
export {
  useProjectGithubRepo,
  sanitizeRepoName,
  githubRepoReadiness,
  type UseProjectGithubRepoOptions,
  type UseProjectGithubRepoResult,
  type GithubRepoNameStatus,
  type GithubRepoReadiness,
} from './hooks/useProjectGithubRepo'
export type { ProjectDataQuery, ProjectDataPutInput, ProjectDataRef } from './api/projectData'

// App↔Overseer postMessage bridge protocol (shared by the ProjectAppView
// web + native transports; semantics supplied by the host's onBridgeMessage).
export {
  BRIDGE_PREFIX,
  bridgeMessageName,
  buildBridgeResponse,
  parseBridgeMessage,
  type BridgeRequest,
  type BridgeResponse,
} from './utils/appBridge'

// Entities (knowledge graph nodes) for the active project. Listens to the
// `entities:updated` WS topic.
export {
  EntitiesProvider,
  useEntities,
  type EntitiesContextValue,
} from './contexts/EntitiesContext'

// Live data: the global catalogue of data sources + the active project's
// subscriptions. Listens to the `liveData:updated` WS topic.
export {
  DataSourcesProvider,
  useDataSources,
  type DataSourcesContextValue,
} from './contexts/DataSourcesContext'
export {
  emptySourceForm,
  sourceToForm,
  formToSourceInput,
  validateSourceForm,
  humanizeMs,
  isSourceFresh,
  type LiveDataSourceForm,
} from './utils/liveDataForm'

// Per-project test + coverage runs. Wires the `tests:progress` / `tests:result`
// WS topics into a deferred runner so callers can `await` a unit / coverage
// run and get back the final result.
export {
  TestsProvider,
  useTests,
  type TestsContextValue,
  type TestsRunKind,
  type TestsRunningJob,
} from './contexts/TestsContext'

// Stories + features for the active project, with dependency resolution
// (display-index → uuid normalisation, blocker lookup). Listens to the
// `stories:updated` WS topic.
export {
  StoriesProvider,
  useStories,
  type InvalidRefError,
  type ResolvedFeatureRef,
  type ResolvedRef,
  type ResolvedStoryRef,
  type StoriesContextValue,
} from './contexts/StoriesContext'

// Web-search API key store (per-provider). Token-gated initial load; CRUD
// goes through `/web-search/keys` endpoints. Shared across all clients.
export {
  WebSearchKeysProvider,
  useWebSearchKeys,
  type WebSearchKeysContextValue,
} from './contexts/WebSearchKeysContext'

// Per-project file list + selected-file content + CRUD. Listens to the
// `files:changed` WS topic. Routes binary/PDF/image clicks to the raw-bytes
// endpoint by skipping the text read for non-text extensions.
export { FilesProvider, useFiles, type FilesContextValue } from './contexts/FilesContext'

// Ingestion job tracker. Listens to `ingestion:progress` WS topic and
// maintains a Map of in-flight + recently-completed jobs.
export {
  IngestionProvider,
  useIngestion,
  type IngestionContextValue,
  type IngestionJobState,
} from './contexts/IngestionContext'

// Tool registry + execute / preview. Token-gated initial load; per-call
// project context comes from `useActiveProject`.
export { ToolsProvider, useTools, type ToolsContextValue } from './contexts/ToolsContext'

// Agent-run orchestration. Derives `runs` from `useChats()` and starts /
// cancels / deletes / rates runs via the backend. Requires the chats /
// LLM-configs / git-credentials / web-search-keys providers above it.
export {
  AgentsProvider,
  useAgents,
  AGENT_TYPES,
  type AgentsContextValue,
  type AgentType,
  type RunChat,
} from './contexts/AgentsContext'

// Per-project git state (status / branches / log / stashes) + every
// mutation op (commit, push, pull, stash, merge, etc.). Takes a `storage`
// adapter for per-project merge prefs persistence — host apps pass a
// `localStorage`-backed adapter on web/desktop and an MMKV-backed
// adapter on mobile.
export {
  GitProvider,
  useGit,
  type GitContextValue,
  type GitCredentialError,
  type GitProviderProps,
  type GitSelection,
  type LocalDiff,
  type LocalDiffEntry,
  type MergePreferences,
} from './contexts/GitContext'

// Read-only overseer Git data layer — shared between web, desktop, and
// mobile. Tracks just the commit log (paged) and exposes a per-commit
// diff fetcher; subscribes to `overseer:git-status-changed` over the WS
// hub for live refresh. The mutating side of the overseer (commit, push,
// daily-squash) is owned by the backend, not the UI.
export {
  OverseerGitProvider,
  useOverseerGit,
  OVERSEER_AUTOMATION_TOOLTIP,
  type OverseerGitContextValue,
} from './contexts/OverseerGitContext'

// SWR cache primitive. App-side contexts that the host owns
// (GitContext, AgentsContext) import this to cache per-project bundles
// so project switches render from memory while a background revalidate
// reconciles with the backend. See
// thefactory-ui/src/headless/utils/projectResourceCache.ts for the
// LRU + ETag semantics.
export { ProjectResourceCache, type CacheEntry } from './utils/projectResourceCache'
