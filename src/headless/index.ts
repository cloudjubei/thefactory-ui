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
  useWebSearchBrowserSetting,
  type WebSearchBrowserSetting,
} from './hooks/useWebSearchBrowserSetting'
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
  chatBadgeTally,
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
  type FeatureRequestDeliveryForm,
  type FeatureRequestHandoverForm,
} from './hooks/useCrossProjectRequests'
export {
  useFeatureRequestDecision,
  type FeatureRequestDecisionState,
} from './hooks/useFeatureRequestDecision'
export {
  useIncomingFeatureRequest,
  type IncomingFeatureRequestState,
} from './hooks/useIncomingFeatureRequest'
export {
  canSettleFeatureRequest,
  canStartFeatureRequestAgain,
  featureRequestAcceptHint,
  featureRequestBriefOfToolArgs,
  featureRequestChatContext,
  featureRequestCountsLine,
  featureRequestCycleWarning,
  featureRequestWaitCycleWarning,
  featureRequestPhase,
  featureRequestRejectedLine,
  featureRequestRejectPrompt,
  featureRequestSections,
  featureRequestSettledLine,
  featureRequestSettleFormReady,
  featureRequestSettleHint,
  featureRequestStartAgainChoice,
  featureRequestStatusView,
  featureRequestStoryLabel,
  featureRequestSummary,
  featureRequestTakenOverLinks,
  featureRequestViaLabel,
  featureRequestWaitingLine,
  hiddenFeatureRequestIntro,
} from './utils/featureRequestView'
export {
  FEATURE_REQUEST_ACCEPTANCE_LINES,
  FEATURE_REQUEST_COMPOSER_HINT,
  FEATURE_REQUEST_DECIDE_HEADING,
  FEATURE_REQUEST_OPEN_FULL_LABEL,
  FEATURE_REQUEST_SECTION_TITLES,
  FEATURE_REQUEST_SETTLE_WORDS,
  FEATURE_REQUEST_START_AGAIN_WORDS,
  FEATURE_REQUEST_STATUS_VIEW,
} from './utils/featureRequestViewConstants'
export type {
  FeatureRequestItemView,
  FeatureRequestLinkView,
  FeatureRequestPhase,
  FeatureRequestSettledView,
  FeatureRequestSettleMode,
  FeatureRequestStartAgainChoice,
  FeatureRequestSectionId,
  FeatureRequestSectionView,
  FeatureRequestStatusView,
} from './utils/featureRequestViewTypes'
export { crossProjectNotification, type CrossProjectNotification } from './utils/crossProjectNotify'
export {
  useCrossProjectSettings,
  type CrossProjectSettingsState,
} from './hooks/useCrossProjectSettings'
export {
  isAcceptanceMode,
  readAcceptanceLayer,
  resolveAcceptance,
} from './utils/crossProjectSettings'
export { useChatToolCatalog } from './hooks/useChatToolCatalog'
export {
  applyChatToolApprovalMode,
  applyChatToolToggle,
  buildChatToolApprovalToggle,
  buildChatToolToggles,
  chatOffersFinishTurnOnErrors,
  filterChatToolToggles,
  groupChatToolToggles,
  resetChatToolToggles,
} from './utils/chatToolToggles'
export type {
  ChatToolApprovalToggle,
  ChatToolCatalogEntry,
  ChatToolRunner,
  ChatToolSettings,
  ChatToolToggle,
  ChatToolToggleGroup,
} from './utils/chatToolTogglesTypes'
export { applyChatTurnLimit, buildChatTurnLimit } from './utils/chatTurnLimit'
export {
  CHAT_TURN_LIMIT_HINT,
  CHAT_TURN_LIMIT_MAX,
  CHAT_TURN_LIMIT_MIN,
  CHAT_TURN_LIMIT_START,
} from './utils/chatTurnLimitConstants'
export type { ChatTurnLimit, ChatTurnLimitSettings } from './utils/chatTurnLimitTypes'
export {
  useResolvedTheme,
  type ResolvedTheme,
  type SystemThemeSource,
  type Theme,
  type UseResolvedThemeOptions,
} from './hooks/useResolvedTheme'
export { CodeBlockThemeProvider, useCodeBlockTheme } from './hooks/useCodeBlockTheme'
export { CODE_BLOCK_PALETTES, CODE_BLOCK_SURFACES } from './utils/codeBlockConstants'
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
export { useAppDirtyGuard, type UseAppDirtyGuard } from './hooks/useAppDirtyGuard'
export {
  LeaveGuardProvider,
  useLeaveBlocker,
  useLeaveGuardState,
  useLeaveGuardStore,
  useRequestLeave,
} from './contexts/LeaveGuardContext'
export { LeaveGuardStore } from './utils/leaveGuardStore'
export { LEAVE_CONFIRM_LABEL, LEAVE_CONFIRM_TITLE } from './utils/leaveGuardConstants'
export type { LeaveGuardListener, LeaveGuardState, PendingLeave } from './utils/leaveGuardTypes'
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
  chatUnreadMessages,
  chatNotifyCountsOf,
  computeChatRowStatus,
  chatRowBadge,
  isChatUnread,
  markSeen,
  type ChatRowStatus,
  type ChatsSeenMap,
} from './utils/chatRowStatus'
export { useOpenChat } from './hooks/useOpenChat'
export {
  chatMessageCount,
  chatMessageTimes,
  chatNeedsYouTimesOf,
  chatLastActivityAt,
  byLastActivity,
  isChatLoaded,
  type ChatListEntry,
  type ChatMessagesShape,
} from './utils/chatListEntry'
export { chatAsksNewsSince, chatNewsSince } from './utils/chatNews'
export type { ChatNewsCheck, ChatNewsEntry, ChatNewsMarks } from './utils/chatNewsTypes'
export {
  chatKindNotifyLevel,
  chatNotifyKind,
  chatNotifyLevel,
  chatNotifyLevelOptions,
  chatNotifyNews,
  withChatNotifyLevel,
} from './utils/chatNotify'
export * from './utils/chatNotifyConstants'
export type {
  AgentMessagesDisplay,
  ChatNotifyCounts,
  ChatNotifyKind,
  ChatNotifyLevel,
  ChatNotifyLevelOption,
  ChatNotifyLevels,
  ChatNotifyNews,
} from './utils/chatNotifyTypes'
export { useChatNotifyLevel, type UseChatNotifyLevel } from './hooks/useChatNotifyLevel'
export { useChatNewsNotifier, type ChatNewsNotification } from './hooks/useChatNewsNotifier'
export { chatBadgeInputOf, chatChannelOf, processRunChatNewsByRun } from './utils/chatChannel'
export type { ChatChannel, ProcessRunChatNews } from './utils/chatChannelTypes'
export { useProcessRunChatNews } from './hooks/useProcessRunChatNews'
export { useProcessRunChat, type UseProcessRunChat } from './hooks/useProcessRunChat'
export { resolveProcessRunChatRoot } from './utils/processRunChatRoot'
export type { ProcessRunTreeLink, ProcessRunTreeReader } from './utils/processRunChatRootTypes'
export { useProcessStopClock } from './hooks/useProcessStopClock'
export { processRunManagerLine } from './utils/processRunStop'
export {
  PROCESS_NESTED_RUN_OPEN,
  PROCESS_RUN_MANAGER_LINE,
  PROCESS_STOP_CLOCK_MS,
} from './utils/processRunStopConstants'
export {
  agentExchangeLayout,
  agentExchangeLine,
  agentExchangeStartOf,
} from './utils/agentExchanges'
export * from './utils/agentExchangesConstants'
export type {
  AgentExchange,
  AgentExchangeLayout,
  AgentExchangeLineView,
} from './utils/agentExchangesTypes'
export { managerBriefView, managerEscalationView, managerOutcomeView } from './utils/managerCards'
export * from './utils/managerCardsConstants'
export type {
  ManagerBriefView,
  ManagerCardStanding,
  ManagerEscalationView,
  ManagerInterventionStanding,
  ManagerOutcomeView,
  ManagerPreReadStanding,
} from './utils/managerCardsTypes'
export {
  managerEscalationStanding,
  managerInterventionStanding,
  managerPreReadStanding,
} from './utils/managerCardStanding'
export { useManagerCardStanding } from './hooks/useManagerCardStanding'
export {
  isOpenChangesCardOnlyMessage,
  openChangesNoticeView,
  openChangesWaitWords,
} from './utils/openChangesNotice'
export { OPEN_CHANGES_NOTICE_COPY } from './utils/openChangesNoticeConstants'
export type {
  OpenChangesNoticeBusy,
  OpenChangesNoticeInput,
  OpenChangesNoticeView,
} from './utils/openChangesNoticeTypes'
export { reviewOnBaseOfferView } from './utils/reviewOnBase'
export { REVIEW_ON_BASE_COPY, REVIEW_ON_BASE_ERROR } from './utils/reviewOnBaseConstants'
export type { ReviewOnBaseInput, ReviewOnBaseOfferView } from './utils/reviewOnBaseTypes'
export {
  useReviewOnBase,
  type ReviewOnBaseTarget,
  type UseReviewOnBase,
} from './hooks/useReviewOnBase'
export { chatChangesHeader } from './utils/chatChangesHeader'
export { CHAT_CHANGES_HEADER_COPY } from './utils/chatChangesHeaderConstants'
export type { ChatChangesHeaderInput, ChatChangesHeaderView } from './utils/chatChangesHeaderTypes'
export {
  useChatOpenChanges,
  type ChatOpenChangesTarget,
  type UseChatOpenChanges,
} from './hooks/useChatOpenChanges'
export {
  chatChangesBarView,
  chatChangesMarkerView,
  chatChangesVerdictTag,
  chatReviewHeader,
  chatReviewLayout,
  chatReviewPanelWidth,
} from './utils/chatChangesDock'
export {
  CHAT_CHANGES_DOCK_COPY,
  CHAT_REVIEW_CHAT_MIN_WIDTH,
  CHAT_REVIEW_PANEL_DEFAULT_WIDTH,
  CHAT_REVIEW_PANEL_MIN_WIDTH,
  CHAT_REVIEW_SIDE_MIN_WIDTH,
} from './utils/chatChangesDockConstants'
export type {
  ChatChangesBarInput,
  ChatChangesBarView,
  ChatChangesMarkerAction,
  ChatChangesMarkerInput,
  ChatChangesMarkerView,
  ChatChangesTag,
  ChatChangesVerdictInput,
  ChatReviewHeaderInput,
  ChatReviewActions,
  ChatReviewHeaderView,
  ChatReviewLayout,
} from './utils/chatChangesDockTypes'
export {
  useChatChangesMarker,
  useChatReviewHeader,
  type ChatChangesMarkerPlace,
} from './hooks/useChatChangesDock'
export { useRunSignoffVerdict } from './hooks/useRunSignoffVerdict'
export { useRunPassedProof } from './hooks/useRunPassedProof'
export {
  processParkClosure,
  processParkStanding,
  processRunWaitsAt,
} from './utils/processParkStanding'
export * from './utils/processParkStandingConstants'
export type {
  ParkClosure,
  ParkStanding,
  ParkStandingRun,
  ParkToken,
} from './utils/processParkStandingTypes'
export { useProcessParkStanding } from './hooks/useProcessParkStanding'
export {
  newestChecksEntryId,
  siblingFallbackCheckSets,
  siblingFallbackNoticeState,
  siblingFallbackView,
} from './utils/siblingFallbackView'
export * from './utils/siblingFallbackViewConstants'
export type {
  SiblingFallbackCheckSet,
  SiblingFallbackCheckSetId,
  SiblingFallbackChip,
  SiblingFallbackNoticeState,
  SiblingFallbackView,
} from './utils/siblingFallbackViewTypes'
export { useSiblingFallbackNotice } from './hooks/useSiblingFallbackNotice'
export {
  projectStableBranchError,
  projectStableBranchField,
  projectStableBranchOf,
} from './utils/projectStableBranch'
export * from './utils/projectStableBranchConstants'

// Badge aggregation
export {
  EMPTY_BADGE_STATE,
  aggregateGroupBadgeState,
  formatBadgeCount,
  hasAnyBadge,
  processTallyByProject,
} from './utils/badgeAggregation'
export type { BadgeState, ProcessTally } from './utils/badgeAggregationTypes'

// Nav-row indicator — the one precedence web `NavRow` and native `NavDrawer` render.
export {
  groupTabIndicator,
  inkBadgeTitle,
  navRowIndicator,
  navRowTitle,
  scopeRowIndicator,
  shellTabIndicator,
} from './utils/navIndicator'
export type { NavRowIndicator, NavRowSignals } from './utils/navIndicatorTypes'
export {
  chatAgentLogin,
  cliLoginOf,
  expiredSignInNames,
  expiredSignInsByScope,
  processRunAgentLogin,
  scopeSignInNames,
  settingsNavIndicator,
  signInCardsByChat,
  signInExpiredTitle,
  signInName,
  signInsExpiredTitle,
  storedSignInsExpired,
} from './utils/signInExpiry'
export type {
  ActiveCliLogin,
  AgentLogin,
  CliLogin,
  ExpiredSignIns,
  ScopeSignIns,
  SignInChat,
  SignInChatRunner,
  SignInLogins,
  SignInRun,
} from './utils/signInExpiryTypes'
export {
  useExpiredSignIns,
  useStoredSignInsExpired,
  type ExpiredSignInChat,
} from './hooks/useExpiredSignIns'
export { useSignInCardsByChat } from './hooks/useSignInCardsByChat'

// Ink badge — the one layout the web and native badges draw.
export {
  inkBadgeLayout,
  inkBadgeLook,
  inkBadgeParts,
  inkBadgeShares,
  inkChannelColors,
} from './utils/inkBadge'
export {
  BADGE_CHANGE_COLOURS_LABEL,
  BADGE_CHANNEL_COLOURS_LABEL,
  BADGE_CHANNEL_SWATCHES,
  BADGE_DEFAULT_LABEL,
  BADGE_MODE_LEGEND,
  BADGE_MODE_OPTIONS,
  BADGE_MOTION_LEGEND,
  BADGE_MOTION_OPTIONS,
  BADGE_PREVIEW_LABEL,
  BADGE_PREVIEW_ROWS,
  BADGE_RESET_LABEL,
  BADGE_SAMPLE_IDLE,
  BADGE_SAMPLE_RUNNING,
  BADGE_SETTINGS_INTRO,
  BADGE_SETTINGS_TITLE,
  BADGE_STYLE_LEGEND,
  BADGE_STYLE_OPTIONS,
  INK_BADGE_COLORS,
  INK_BADGE_METRICS,
  INK_FADE_SECONDS,
  INK_FRESH_DOT_COLOR,
  INK_MIXED_TEXT_COLOR,
  INK_MIXED_TEXT_SHADOW,
} from './utils/inkBadgeConstants'
export type {
  InkBadgeState,
  InkBadgeLayout,
  InkBadgeLook,
  InkBlob,
  InkChannel,
  InkColor,
  InkCore,
  InkDrop,
  InkFill,
  InkMotion,
  InkPart,
  InkShare,
  InkStop,
} from './utils/inkBadgeTypes'

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
  canonicalToolPreviewName,
  getToolHeaderPath,
  isCompletelyNewFile,
  isFilePathTool,
  looksLikeDiffPatchText,
  reorderedFeatureId,
  searchResultLines,
  storyAfterPatch,
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

// A cost, the one way every surface shows it: the chip says the charge in
// dollars; one details view (web popover, native sheet) says the rest.
export {
  addCost,
  cliRunCost,
  cliRunMessageUsage,
  cliRunSpendRecord,
  costChipLabel,
  costDetailsView,
  formatCostUSD,
  messageUsageCost,
  pickCost,
  probeCostLabel,
} from './utils/costDetails'
export type {
  CliRunCostSource,
  CliRunSpendRecord,
  CostDetailsLine,
  CostDetailsRow,
  CostDetailsView,
  CostSource,
  CostSpend,
} from './utils/costDetailsTypes'

// Where a time chip's time went — agent thinking, tools & commands, setup, and
// waiting beside it — worded once for the web popover and the native sheet.
export { processTimeDetailsView } from './utils/processTimeDetails'
export {
  PROCESS_TIME_MANAGER_LABEL,
  PROCESS_TIME_PART_HINTS,
  PROCESS_TIME_PART_LABELS,
  PROCESS_TIME_QUEUED_LABEL,
  PROCESS_TIME_TOOLS_SHOWN,
  PROCESS_TIME_WAITING_LABEL,
} from './utils/processTimeDetailsConstants'
export type {
  ProcessTimeDetailsLine,
  ProcessTimeDetailsRow,
  ProcessTimeDetailsTool,
  ProcessTimeDetailsView,
  ProcessTimePart,
} from './utils/processTimeDetailsTypes'

// The model price list, worded once for every client's pricing panel: each
// price's source, and every rate it is billed at, cache writes included.
export { formatRatePerMTokens, priceListEntryView } from './utils/priceList'
export { PRICE_RATE_LABELS } from './utils/priceListConstants'
export type { PriceListEntryView, PriceRate, PriceRateKey } from './utils/priceListTypes'

// CLI-run review evidence bundle — verification chip / check rows / verdict /
// land-failure / merge-outcome derivations shared by the web + native
// `CliRunArtifactPanel`.
export {
  alreadyOnBaseView,
  asRunVerification,
  checkTone,
  isReviewReasonValid,
  landFailureSummary,
  mergeNotice,
  reviewActionMode,
  reviewChangeCounts,
  runReviewFacts,
  verdictSummary,
  verificationCheckRows,
  ranReviewChecks,
  reviewCheckGroups,
  reviewCheckMeta,
  testLayerLines,
  formatChangeRequestMessage,
} from './utils/runReview'
export {
  LAUNCH_NOTE_MAX_CHARS,
  START_FEATURE_WORK_TOOL_NAME,
  formatGrantDetail,
  grantDetailView,
  launchRefusalMessage,
  isStartFeatureWorkGrant,
  isToolAskDecidedOnRow,
  pendingApprovalGrants,
  startFeatureWorkGrantSummary,
} from './utils/approvalGrant'
export type { GrantDetailView } from './utils/approvalGrantTypes'
export type { StartFeatureWorkGrantSummary, StartFeatureWorkRunner } from './utils/approvalGrant'
export { approveActionDescriptors, earnedApproveActions } from './utils/approveActions'
export type { EarnedApproveActions } from './utils/approveActions'
export {
  checkActionOffer,
  checkCallout,
  checkChipFace,
  checkRanInSentence,
  checkMethodFor,
  checkMethodRows,
  checkRowLayout,
  isAbsentCheck,
  ranCheckMethods,
  reviewTabOrder,
  evidenceMethodFor,
  reviewTabs,
  signoffVerdict,
  tabForMethod,
} from './utils/checkMethods'
export type { CheckRowLayout } from './utils/checkMethods'
export {
  developerChecksNote,
  latestProcessChecks,
  processCheckRows,
  processCheckWaitingView,
  withProcessChecks,
} from './utils/processChecksView'
export {
  DEVELOPER_CHECK_ROLES,
  DEVELOPER_RAN_NO_CHECKS,
  DEVELOPER_VERIFIED_LABEL,
  CHECK_RAN_IN_LABELS,
  PROCESS_CHECK_ADVISORY_LABEL,
  PROCESS_CHECK_MARKS,
} from './utils/processChecksViewConstants'
export type {
  DeveloperChecksNote,
  ProcessCheckRow,
  ProcessCheckWaitingView,
  ProcessChecksResult,
} from './utils/processChecksViewTypes'
export { agentRoleLabel } from './utils/agentRole'
export { AGENT_ROLE_LABELS } from './utils/agentRoleConstants'
export { isReviewInProgress } from './utils/reviewProgress'
export type { ReviewInProgressInput } from './utils/reviewProgress'
export { handoffRequest } from './utils/handoffRequests'
export type { HandoffFact, HandoffPurpose, HandoffRequest } from './utils/handoffRequests'
export type {
  CheckActionHost,
  CheckActionOffer,
  CheckCallout,
  CheckChipFace,
  CheckMethodAction,
  CheckMethodFill,
  CheckMethodId,
  CheckMethodRow,
  CheckMethodState,
  CheckUnfinishedTests,
  ReviewTab,
  ReviewTabId,
  ReviewTabsInput,
  SignoffVerdict,
  SignoffVerdictInput,
  SignoffVerdictKey,
} from './utils/checkMethodTypes'
export {
  CHECK_AVAILABLE_LABEL,
  CHECK_AVAILABLE_SENTENCE,
  CHECK_UNSERVABLE_LEAD,
  CHECK_CHIP_MARKS,
  CHECK_METHOD_LABELS,
  CHECK_METHOD_ORDER,
  PROJECT_CHECK_METHOD,
  AGENT_UNREACHABLE,
  CHECK_STATE_LABELS,
  MORE_APPROVE_OPTIONS_LABEL,
  REJECT_EXPLAINER,
  REQUEST_CHANGES_EXPLAINER,
  APPROVE_MENU_HEADS,
  STORY_UNFINISHED_TITLE,
  CHECK_STATE_TONES,
  COLLAPSE_ABSENT_PAST,
  REVIEW_TAB_LABELS,
  REVIEW_TAB_ORDER,
} from './utils/checkMethodConstants'
export {
  IMAGE_ZOOM_MAX,
  IMAGE_ZOOM_MIN,
  IMAGE_ZOOM_STEP,
  clampZoom,
  zoomByWheel,
  zoomIn,
  zoomLabel,
  zoomOut,
} from './utils/imageZoom'
export {
  canPairViewerZoomIn,
  canPairViewerZoomOut,
  effectivePercent,
  fitScale,
  framePane,
  isPannable,
  pairFitScale,
  pairViewerZoomByWheel,
  pairViewerZoomFloor,
  pairViewerZoomIn,
  pairViewerZoomLabel,
  pairViewerZoomOut,
  resolveViewerScale,
  scaledSize,
} from './utils/pairViewerFit'
export { PAIR_VIEWER_MAX_FIT_UPSCALE, PAIR_VIEWER_MIN_SCALE } from './utils/pairViewerFitConstants'
export type {
  PairViewerFitInput,
  PairViewerPairFitInput,
  PairViewerPaneLayout,
  PairViewerSize,
} from './utils/pairViewerFitTypes'
export { censusFeatures, incompleteStoryReason, storyOpenFeatures } from 'thefactory-tools/utils'
export { storyFeatureCounts } from './utils/storyFeatureCounts'
export type { StoryFeatureCounts } from './utils/storyFeatureCountsTypes'
export { featureKindChipLabel, featureKindOf, featureKindPatch } from './utils/featureKind'
export {
  FEATURE_KIND_DESIGN_CHIP,
  FEATURE_KIND_HINTS,
  FEATURE_KIND_OPTIONS,
} from './utils/featureKindConstants'
export type { FeatureKind, FeatureKindOption } from './utils/featureKindTypes'
export { openFeatureQuestions } from './utils/featureQuestions'
export { openQuestionsCardView } from './utils/openQuestionsCard'
export type { OpenQuestionsCardView } from './utils/openQuestionsCardTypes'
export { OPEN_QUESTIONS_COPY } from './utils/openQuestionsCardConstants'
export { chatStopCardView, chatStopDetailsLabel, chatStopRestart } from './utils/chatStopNotice'
export type {
  ChatStopCardView,
  ChatStopCause,
  ChatStopNotice,
  ChatStopRestart,
  ChatStopRestartInput,
} from './utils/chatStopNoticeTypes'
export {
  CHAT_STOP_CAUSE_PILL,
  CHAT_STOP_COPY,
  CHAT_STOP_REPEAT_FROM,
  CHAT_STOP_TURNS_TONE,
  CHAT_STOP_UNKNOWN_TONE,
} from './utils/chatStopNoticeConstants'
export {
  useFeatureQuestionAnswers,
  type UseFeatureQuestionAnswers,
} from './hooks/useFeatureQuestionAnswers'
export { chatClosure } from './utils/chatClosure'
export { chatCloseAction } from './utils/chatCloseAction'
export {
  evidenceViewerImages,
  groupEvidence,
  isViewableImage,
  summarizeEvidence,
  toEvidenceTile,
  capturedOnLabel,
  comparisonPairFacts,
  screenPairMeta,
  screenPairs,
  screenPairFileStem,
  fileNameSlug,
  evidenceFiledWithin,
  latestReport,
  reviewerVerdict,
  codeReviewVerdict,
  isCodeReview,
  isVerifierFiling,
  newestOnly,
  orderReports,
  reportAuthor,
  reportProvenance,
  runReports,
} from './utils/reviewEvidenceView'
export { REPORT_PROVENANCE, REVIEWER_VERDICT_LABEL } from './utils/reviewEvidenceViewConstants'
export type { DecisionExplainer } from './utils/checkMethodConstants'
export type {
  EvidenceGroup,
  EvidenceTile,
  EvidenceViewerImage,
  ReportAuthor,
  ReviewerVerdictReading,
  ScreenPair,
  ScreenPairClass,
  EvidenceWindow,
} from './utils/reviewEvidenceViewTypes'
export {
  entryReportedModel,
  modelDisplayName,
  processRunHeaderModel,
  processRunModelChip,
  processStepModelChip,
  runModelKey,
  runModelLabel,
  runModelOf,
  uniqueRunModels,
  type RunModel,
} from './utils/runModel'
export {
  activeLlmConfig,
  chatChipCliSelection,
  modelChipLabel,
  modelChipProviderLabel,
} from './utils/modelChip'
export type {
  ModelChipConfigLike,
  ModelChipLabel,
  ModelChipLabelInput,
  ChatChipCliInput,
  ChatChipCliSelection,
} from './utils/modelChipTypes'
export {
  asEffortLevel,
  cliModelEffortRows,
  effortDefaultLabel,
  effortLevelLabel,
  modelEffortChoice,
  modelEffortLevels,
} from './utils/modelEffort'
export {
  CLI_MODEL_DEFAULT_EFFORT_HINT,
  CLI_MODEL_DEFAULT_EFFORT_LABEL,
  EFFORT_DEFAULT_LABEL,
  EFFORT_LEVEL_LABELS,
  EFFORT_LEVELS,
  EFFORT_NONE_LABEL,
  EFFORT_NONE_VALUE,
  EFFORT_SWITCH_LABEL,
  LLM_CONFIG_DEFAULT_EFFORT_HINT,
  LLM_CONFIG_DEFAULT_EFFORT_LABEL,
} from './utils/modelEffortConstants'
export type {
  ApiEffortTarget,
  CliEffortTarget,
  CliModelEffortRow,
  ModelEffortChoice,
  ModelEffortSwitch,
  ModelEffortTarget,
} from './utils/modelEffortTypes'
export { useModelEffort } from './hooks/useModelEffort'
export {
  aggregateTestCounts,
  checkTestCounts,
  finishedTestFileCount,
  parseTestCounts,
  testCountLabel,
  testTotalsHeadline,
  type TestCountSource,
  type TestCounts,
  type TestTotalsHeadline,
  type TestTotalsLayer,
  type TestTotalsOutcome,
} from './utils/testCounts'
export { TEST_COUNT_NONE_RAN, TEST_TOTALS_TITLES } from './utils/testCountsConstants'
export { parseTestFailures, type TestFailure } from './utils/testFailures'
export { checkTestResults } from './utils/testResults'
export {
  FINISHED_FILES_WORD,
  TEST_SUITE_MODULE_SEPARATOR,
  UNFINISHED_FILE_WORD,
} from './utils/testResultsConstants'
export type {
  CheckTestResults,
  UnfinishedTestFileView,
  UnfinishedTestsView,
} from './utils/testResultsTypes'
export { terminalOutputView, terminalPlainText } from './utils/terminalOutput'
export {
  TERMINAL_BACKGROUND,
  TERMINAL_BORDER,
  TERMINAL_DIM_OPACITY,
  TERMINAL_FOREGROUND,
  TERMINAL_MAX_HEIGHT,
  TERMINAL_OUTPUT_LABEL,
  TERMINAL_PALETTE,
  TERMINAL_RAW_OUTPUT_LABEL,
} from './utils/terminalOutputConstants'
export type { TerminalColor, TerminalOutputView, TerminalSpan } from './utils/terminalOutputTypes'
export { branchCommitsRefs, commitsSinceBase, type BranchCommit } from './utils/branchCommits'
export type { BranchCommitsReview } from './utils/branchCommitsTypes'
export { useBranchCommits } from './hooks/useBranchCommits'
export {
  isInDeleteRange,
  lastMessageDeleteFromIndex,
  type DeletableMessage,
} from './utils/chatTurnDelete'
export { useEvidenceDiff } from './hooks/useEvidenceDiff'
export type { UseEvidenceDiff } from './hooks/useEvidenceDiff'
export { useReviewEvidenceImage } from './hooks/useReviewEvidenceImage'
export {
  useToolApprovalPreviews,
  type ToolApprovalPreviewFetcher,
} from './hooks/useToolApprovalPreviews'
export { toolApprovalPreviewError, toolCallsAwaitingPreview } from './utils/toolApprovalPreviews'
export type {
  ToolApprovalPreviewFailure,
  ToolApprovalPreviewRequest,
} from './utils/toolApprovalPreviewsTypes'
export type { UseReviewEvidenceImage } from './hooks/useReviewEvidenceImage'
export { useCommitDetails } from './hooks/useCommitDetails'
export { commitChangesLabel, commitDetailsState, commitGitViewPath } from './utils/commitDetails'
export { COMMIT_DETAILS_TEXT } from './utils/commitDetailsConstants'
export type { CommitChanges, CommitDetails, CommitDetailsState } from './utils/commitDetailsTypes'
export { useReviewEvidence } from './hooks/useReviewEvidence'
export { useStepFiling } from './hooks/useStepFiling'
export type { UseReviewEvidence } from './hooks/useReviewEvidence'
export { useStorySignoff } from './hooks/useStorySignoff'
export { useProjectChecks } from './hooks/useProjectChecks'
export type { UseProjectChecks } from './hooks/useProjectChecks'
export { checkFlakyChip, projectFlakeRows } from './utils/projectFlakes'
export {
  PROJECT_FLAKES_HEADING,
  PROJECT_FLAKES_NONE,
  checkFlakyChipDetail,
  checkFlakyChipLabel,
  projectFlakeFixFiled,
  projectFlakeSeen,
} from './utils/projectFlakesConstants'
export type { CheckFlakyChip, ProjectFlakeRow } from './utils/projectFlakesTypes'
export type { UseStorySignoff } from './hooks/useStorySignoff'
export { useVerifyAttemptEvidence } from './hooks/useVerifyAttemptEvidence'
export type { UseVerifyAttemptEvidence } from './hooks/useVerifyAttemptEvidence'
// What a verify attempt proved — the gate's own judgement, shared by the story
// sign-off and the per-attempt mini sign-off on both clients.
export {
  acceptedVerifyAttempt,
  captureBuildCaption,
  codeReviewVerdictNote,
  evidenceLoadState,
  featureVerifySectionProps,
  featureVerifyView,
  mergeEvidenceTiles,
  missingEvidenceIds,
  overlayPairsFor,
  pixelChangeLabel,
  proofChangeMarker,
  proofScreensPane,
  proofThumbnailFrame,
  reviewerVerdictNote,
  shortSha,
  verifyAttemptEvidence,
  verifyAttemptFacts,
  verifyAttempts,
  verifyAttemptStanding,
  verifyAttemptStatus,
  verifyGateLine,
  verifyProofHeader,
  verifyProofView,
  verifySectionProps,
} from './utils/verifyProof'
export type {
  CaptureBuildCaption,
  DryBuildPart,
  DryProofRow,
  EvidenceLoadState,
  FeatureVerifySectionProps,
  FeatureVerifyView,
  ProofNotCountedFold,
  ProofPairView,
  ProofScreensPane,
  ProofScreenView,
  ProofThumbnail,
  ProofThumbnailFrame,
  ProofThumbnailSide,
  ProofUnpairedView,
  StatedProofMode,
  VerifyAttempt,
  VerifyAttemptEvidence,
  VerifyAttemptRun,
  VerifyAttemptStanding,
  VerifyAttemptView,
  VerifyProofDryLine,
  VerifyProofHeader,
  VerifyProofMode,
  VerifyProofSummary,
  VerifyProofTone,
  VerifyProofView,
  VerifyReviewerVerdict,
  VerifySectionProps,
  VerifyVerdictNote,
} from './utils/verifyProofTypes'
export type { ProcessProofPair, ProcessVerifyProof } from 'thefactory-tools/types'
export {
  aggregateStoryVerdict,
  buildStorySignoff,
  signoffEvidence,
  signoffFixSectionProps,
  signoffLoadStatus,
  signoffLoadingLabel,
  signoffSectionProps,
  signoffSections,
  signoffVerifyViews,
} from './utils/storySignoff'
export { CAPTURE_SAME_CODE_LABEL } from './utils/verifyProofConstants'
export {
  EMPTY_SIGNOFF_SECTION,
  SIGNOFF_LOAD_FAILED,
  SIGNOFF_LOADING,
} from './utils/storySignoffConstants'
export type {
  BuildStorySignoffInput,
  FeatureSignoff,
  FixSentBy,
  FixSignoff,
  SectionCodeReview,
  SectionSignoff,
  OverallSignoff,
  SignoffAgent,
  SignoffHeadline,
  SignoffLoadStatus,
  SignoffSection,
  SignoffSectionProps,
  SignoffSources,
  SignoffSourceState,
  SignoffTally,
  StoryDigest,
  StoryFeatureRef,
  StorySignoff,
  StorySignoffProcessRun,
  StorySignoffRun,
  StoryStepKey,
  StoryStepLine,
  StoryStepTone,
} from './utils/storySignoffTypes'
export {
  codeReviewFindingGroups,
  codeReviewFindingPlace,
  codeReviewFindingTitle,
  codeReviewFindingsSummary,
  codeReviewPreview,
  codeReviewSectionsOf,
  codeReviewVerdictBadge,
  codeReviewVerdictOf,
  codeReviewView,
  codeReviewWhere,
} from './utils/signoffCodeReview'
export {
  CODE_REVIEW_GROUP_BY_LABEL,
  CODE_REVIEW_GROUP_BY_OPTIONS,
  CODE_REVIEW_HOW_SHOWN_LABEL,
  CODE_REVIEW_SECTION_TITLES,
  CODE_REVIEW_UNPROVEN_CHIPS,
  CODE_REVIEW_WORTH_A_LOOK_LABEL,
} from './utils/signoffCodeReviewConstants'
export type {
  CodeReviewCriterionRow,
  CodeReviewFindingGroup,
  CodeReviewFindingPlace,
  CodeReviewFindingRow,
  CodeReviewFindingsGroupBy,
  CodeReviewPreview,
  CodeReviewRecordedVerdict,
  CodeReviewTile,
  CodeReviewTone,
  CodeReviewUnproven,
  CodeReviewVerdictBadge,
  CodeReviewView,
  CodeReviewWhere,
} from './utils/signoffCodeReviewTypes'
export { signoffCostView, signoffTimeView, signoffWorkOf } from './utils/signoffWork'
export { SIGNOFF_TIME_PARTS, SIGNOFF_TIME_PART_LABELS } from './utils/signoffWorkConstants'
export type {
  SignoffCostRow,
  SignoffCostTokens,
  SignoffCostView,
  SignoffTimePart,
  SignoffTimeRow,
  SignoffTimeSegment,
  SignoffTimeView,
  SignoffWork,
  SignoffWorkRole,
  SignoffWorkScope,
  SignoffWorkStep,
} from './utils/signoffWorkTypes'
export { signoffSpecCriteria } from './utils/signoffSpec'
export {
  SIGNOFF_SPEC_CRITERIA_CAPTION,
  SIGNOFF_SPEC_CRITERIA_CHIP,
  SIGNOFF_SPEC_DESCRIPTION_LINES,
  SIGNOFF_SPEC_DESCRIPTION_TOGGLE,
} from './utils/signoffSpecConstants'
export type { SignoffSpecCriteriaGroup } from './utils/signoffSpecTypes'
export { signoffDecisionItems } from './utils/signoffDecision'
export {
  SIGNOFF_DECISION_PAIR_LABEL,
  SIGNOFF_DECISION_STEP_LABEL,
} from './utils/signoffDecisionConstants'
export type {
  SignoffDecisionAction,
  SignoffDecisionFix,
  SignoffDecisionInput,
  SignoffDecisionItem,
  SignoffDecisionTone,
  SignoffStepTarget,
} from './utils/signoffDecisionTypes'
export {
  reportBodyView,
  reportPreviewTiles,
  reportSectionsOf,
  reportTiles,
  signoffProofRows,
  signoffReportView,
} from './utils/signoffReport'
export type {
  ReportPreviewTile,
  ReportProofRow,
  ReportSectionView,
  ReportTile,
  ReportTileDetail,
  SignoffProofInput,
  SignoffProofStepLine,
  SignoffReportInput,
  SignoffReportView,
} from './utils/signoffReportTypes'
export {
  acceptanceCriteriaLine,
  acceptanceDeliveredLine,
  judgeAcceptance,
  matchAcceptanceLines,
  sumAcceptanceJudgements,
} from './utils/acceptanceJudgement'
export type {
  AcceptanceDeliveredLine,
  AcceptanceJudgement,
  AcceptanceLineJudgement,
  JudgedCriterion,
} from './utils/acceptanceJudgementTypes'
export {
  acceptanceCriteriaLines,
  evidenceChipForTab,
  isEvidenceChipSelected,
  signoffAttentionItems,
  signoffEvidenceChips,
  signoffFeatureRow,
  signoffFeaturesDelivered,
  signoffMergeHold,
  signoffProofChips,
  signoffRequestOutcome,
} from './utils/signoffPage'
export {
  SIGNOFF_APPROVE_LABEL,
  SIGNOFF_CANCEL_LABEL,
  SIGNOFF_DECISION_LABEL,
  SIGNOFF_GROUP_CHIP_LABEL,
  SIGNOFF_GROUP_CHIP_TITLE,
  SIGNOFF_REJECT_CONFIRM,
  SIGNOFF_REJECT_CONFIRM_LABEL,
  SIGNOFF_SECTION_TITLES,
} from './utils/signoffPageConstants'
export type {
  SignoffAttentionInput,
  SignoffAttentionItem,
  SignoffEvidenceChip,
  SignoffEvidenceTarget,
  SignoffFeatureRowView,
  SignoffMergeHold,
  SignoffMergeHoldLeg,
  SignoffProofChip,
  SignoffRequestOutcome,
} from './utils/signoffPageTypes'
export { processStageChips, processStepRowView, stepFilingOf } from './utils/processStepRow'
export { processSignoffDiscussDraft, processSignoffRecord } from './utils/processSignoffRecord'
export {
  PROCESS_SIGNOFF_DECISION_VIEW,
  PROCESS_SIGNOFF_RECORD_TEXT,
} from './utils/processSignoffRecordConstants'
export type {
  ProcessSignoffDecisionView,
  ProcessSignoffRecordView,
} from './utils/processSignoffRecordTypes'
export type {
  ProcessStageChip,
  ProcessStepPreviewKind,
  ProcessStepRowView,
} from './utils/processStepRowTypes'
export { clipLine, firstSentence, plainMarkdownLine } from './utils/textLine'
export type { ChatCloseAction } from './utils/chatCloseAction'
export type { ChatClosure } from './utils/chatClosure'
export type { OpenFeatureQuestion } from './utils/featureQuestions'
export type { StoryFeatureCensus } from 'thefactory-tools/types'
export type { ProofKind, ProofKindUnavailable, ProofPlan } from 'thefactory-tools/types'
export {
  ALREADY_ON_BASE_MESSAGE,
  ALREADY_ON_BASE_TITLE,
  CHECK_STATUS_TONES,
  LAND_FAILURE_LEAD,
  LAND_FAILURE_REASON_LABELS,
  LAND_FAILURE_TITLE,
  NO_SOURCE_CHANGES_TITLE,
  MERGE_BLOCKED_FALLBACK,
  MERGE_FAILED_FALLBACK,
  NOT_VERIFIED_DETAIL,
  VERDICT_AUTHOR_LABELS,
  VERDICT_LABELS,
  VERDICT_TONES,
} from './utils/runReviewConstants'
export type {
  AlreadyOnBaseView,
  ReviewActionInput,
  ReviewActionMode,
  ReviewChangeCounts,
  ApproveActionDescriptor,
  ReviewCheckRow,
  ReviewCheckGroups,
  TestLayerLines,
  ReviewLandFailureSummary,
  ReviewMergeNotice,
  ReviewTone,
  ReviewVerdictSummary,
  RunReviewFacts,
} from './utils/runReviewTypes'

// Story / feature status
export {
  SETTABLE_STATUS_ORDER,
  STATUS_LABELS,
  STATUS_ORDER,
  isStoryStatus,
  statusKey,
  statusLabel,
  type StatusPickerValue,
  type StatusSemanticKey,
  type StoryStatus,
} from './utils/status'
export {
  featureProcessOverlay,
  isFeatureInLiveRun,
  isReviewable,
  processStatusOverlay,
} from './utils/processStatusOverlay'
export type { ProcessStatusOverlay } from './utils/processStatusOverlay'
export { PROCESS_STATUS_OVERLAY_TITLES } from './utils/processStatusOverlayConstants'

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
  ASSISTANT_NAV_DEF,
  GROUP_TAB_DEFS,
  SHELL_TAB_DEFS,
  groupTabToProjectTab,
  isGroupTabKey,
  isShellTabKey,
  projectShowsShellTab,
  projectTabToGroupTab,
  shellTabForProject,
  splitGroupsAndProjects,
  type GroupTabDef,
  type GroupTabKey,
  type NavGroupLike,
  type NavIconKey,
  type NavProjectLike,
  type ShellTabDef,
  type ShellTabKey,
  type ShellTabProjectFlags,
  type SplitGroupsAndProjects,
} from './utils/shellNav'

// Persisted client settings (theme, shortcuts, notifications, ...)
// `Theme` and `ChatBadgeCountMode` are owned by their respective hook
// modules and re-exported above — not duplicated here.
export {
  AVAILABLE_THEMES,
  BADGE_COLOR_CATEGORIES,
  BADGE_COLORS,
  BADGE_MODES,
  BADGE_MOTIONS,
  BADGE_STYLES,
  CODE_BLOCK_THEMES,
  DEFAULT_APP_SETTINGS,
  DEFAULT_NOTIFICATION_PREFS,
  DEFAULT_PROJECT_SETTINGS,
  DEFAULT_SHORTCUTS,
  isBadgeColorCategory,
  type AppSettings,
  type BadgeColor,
  type BadgeColorCategory,
  type BadgeMode,
  type BadgeMotion,
  type BadgeStyle,
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
  appDeepLinkParamsPatch,
  appDeepLinkQuery,
  navCurrentReply,
  parseAppDeepLink,
  serializeAppDeepLink,
  shouldPushDeepLink,
  type AppDeepLink,
} from './utils/appDeepLink'
export type { NavCurrentReply } from './utils/appDeepLinkTypes'
export { resolveResourceNav, type ResourceNav } from './utils/resourceNav'
export { linkedFeatureStep } from './utils/featureLink'
export { FEATURE_LINK_PARAM } from './utils/featureLinkConstants'
export { PROCESS_LINK_PARAM } from './utils/processLinkConstants'
export { referencePreview, runReferencePreview } from './utils/referencePreview'
export type {
  ReferencePreview,
  ReferencePreviewAction,
  RunReferencePreview,
} from './utils/referencePreviewTypes'
export { RUN_PREVIEW_OPEN_CHAT } from './utils/referencePreviewConstants'
export type { LinkedFeatureStep } from './utils/featureLinkTypes'
export { dependencyResourceLink } from './utils/dependencyLink'
export type { DependencyLinkTarget } from './utils/dependencyLinkTypes'
export { contextInfoStory } from './utils/contextInfo'
export { chatHeaderView, chatKindOf, chatMessagesCost } from './utils/chatHeader'
export {
  CHAT_AGENT_RUN_KIND_LABEL,
  CHAT_HEADER_ASSISTANT_CONTEXT,
  CHAT_HEADER_CHAT_COST_TITLE,
  CHAT_HEADER_RUN_TIME_TITLE,
  CHAT_KIND_VIEW,
} from './utils/chatHeaderConstants'
export type {
  ChatHeaderInput,
  ChatHeaderPill,
  ChatHeaderView,
  ChatKind,
  ChatKindRamp,
  ChatKindView,
} from './utils/chatHeaderTypes'
export { useChatHeaderView } from './hooks/useChatHeaderView'
export { chatSettingsMenuItems } from './utils/chatSettingsMenu'
export {
  ASSISTANT_SETTINGS_MENU_COPY,
  CHAT_SETTINGS_MENU_COPY,
  SHOW_DEVELOPER_TOOLS_COPY,
} from './utils/chatSettingsMenuConstants'
export type {
  ChatSettingsMenuInput,
  ChatSettingsMenuItem,
  ChatSettingsMenuKey,
  ChatSettingsMenuSection,
} from './utils/chatSettingsMenuTypes'
export {
  featureStripEntries,
  processRunStripEntries,
  stepsStripView,
  storyStatusTone,
  storyStripEntries,
} from './utils/stepsStrip'
export {
  STEPS_STRIP_COPY,
  STEPS_STRIP_FULL_MAX,
  STEPS_STRIP_LABELS,
} from './utils/stepsStripConstants'
export type {
  StepsStripEntry,
  StepsStripItem,
  StepsStripModel,
  StepsStripOptions,
  StepsStripPhase,
  StepsStripView,
} from './utils/stepsStripTypes'
export type { ContextInfoStoryRef } from './utils/contextInfoTypes'
export { fileLineParam, fileLocationPath, textLineRange } from './utils/fileLocation'
export { FILE_LINE_PARAM } from './utils/fileLocationConstants'
export type { TextLineRange } from './utils/fileLocationTypes'
export {
  fileHitLines,
  isSearchableQuery,
  projectSearchGroups,
  projectSearchRows,
  projectSearchStatus,
  projectSearchSummary,
  searchExcerpt,
  searchMatchSegments,
  searchRecordChip,
  searchRecordLink,
  stepSearchCursor,
} from './utils/projectSearch'
export {
  PROJECT_SEARCH_DEBOUNCE_MS,
  PROJECT_SEARCH_EXCERPT_MAX_CHARS,
  PROJECT_SEARCH_GROUP_LABELS,
  PROJECT_SEARCH_MIN_QUERY_CHARS,
  PROJECT_SEARCH_QUERY_PARAM,
  PROJECT_SEARCH_TEXT,
} from './utils/projectSearchConstants'
export type {
  ProjectSearchFileRow,
  ProjectSearchGroup,
  ProjectSearchGroupKey,
  ProjectSearchRecordRow,
  ProjectSearchRow,
  ProjectSearchStatus,
  ProjectSearchTarget,
  SearchRecordChip,
  SearchTextSegment,
} from './utils/projectSearchTypes'
export { useProjectSearch, type UseProjectSearch } from './hooks/useProjectSearch'
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
export {
  invalidateReferenceGroup,
  invalidateReferenceProject,
  useReferences,
  type References,
  type ReferenceScope,
} from './hooks/useReferences'

// File-extension → renderer-kind classifier (markdown / html / image / pdf / text / binary).
export { classifyFileByExtension, type FilePaneKind } from './utils/filePaneKind'

// Chat-view domain types (shared between web and native chat compounds)
export type {
  ChatContextLike,
  ChatLiveStateLike,
  ChatMessageLike,
  MessageUsageLike,
  PendingQuestionGrant,
  UserAsk,
  PendingToolGrant,
  PendingToolGrantData,
  PendingToolGrantDecision,
  AlwaysAllowScope,
  AlwaysAllowChoiceView,
  GrantCovers,
  ToolCallLike,
  ToolResultLike,
  ToolResultTypeLike,
} from './utils/chatTypes'

// Shared chat-title formatter — used by web / mobile / desktop chat-session
// headers so the title reads identically across all clients.
export { formatChatTitle, type ChatTitleInputs } from './utils/chatTitle'

// The Assistant (`GENERAL` chats — scoped to neither a project nor a group):
// its page lists its conversations, newest first, those archived from the list
// in an archived view; its nav item shows what waits on the person in them.
export { globalChatConversations, isGlobalChat, newGlobalChatContext } from 'thefactory-tools/utils'
export {
  assistantConversationRows,
  assistantExpiredSignIns,
  assistantNavIndicator,
} from './utils/assistant'
export {
  ASSISTANT_COPY,
  assistantArchivedNotice,
  assistantBackNotice,
  assistantNewRepliesTitle,
} from './utils/assistantConstants'
export type {
  AssistantChat,
  AssistantRow,
  AssistantRowStatus,
  AssistantRowsInput,
} from './utils/assistantTypes'
export {
  useAssistantConversations,
  type AssistantConversations,
} from './hooks/useAssistantConversations'

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
export { describeBackendStartup } from './api/backendStartup'
export type {
  BackendKnowledgeMapsStartup,
  BackendStartup,
  BackendStartupLine,
  BackendStartupPass,
} from './api/backendStartupTypes'
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
  type ChatsProviderProps,
  type CreateChatsContextDeps,
} from './contexts/createChatsContext'
export {
  useChatComposer,
  type ChatPendingQueue,
  type UseChatComposer,
  type UseChatComposerOptions,
} from './hooks/useChatComposer'
export {
  usePendingAutoDispatch,
  type UsePendingAutoDispatchInput,
} from './hooks/usePendingAutoDispatch'
export {
  canAutoDispatch,
  chatDraftStorageKey,
  editPendingMessage,
  enqueueMessage,
  isComposerBlocked,
  isEmptyChatDraft,
  mergeOutgoing,
  parseChatDraft,
  pendingSendNowMode,
  pendingStackView,
  pendingTurnStep,
  removePendingMessage,
  restoreUnsent,
  serializeChatDraft,
  takeOutgoing,
  takePending,
  type ChatDraftTake,
  type TakenChatDraft,
} from './utils/chatDraft'
export { ChatDraftStore } from './utils/chatDraftStore'
export {
  attachmentUploadError,
  chatDropAction,
  chatDropOverlay,
  currentChatDropTarget,
  isFileDrag,
  isImageAttachment,
} from './utils/chatDrop'
export * from './utils/chatDropConstants'
export type * from './utils/chatDropTypes'
export * from './utils/chatDraftConstants'
export type * from './utils/chatDraftTypes'

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
export { useUsageBreakdown, type UseUsageBreakdownInput } from './hooks/useUsageBreakdown'
export type {
  UsageBreakdown,
  UsageModalCostAggregate,
  UsageModalCostBreakdown,
  UsageModalMessage,
  UsageModalModelPrice,
  UsageModalUsage,
  UsageTableRow,
} from './utils/usageBreakdownTypes'
export { useDailyUsage, type UseDailyUsage } from './hooks/useDailyUsage'
export {
  dailyUsageChargedCell,
  dailyUsageDayLabel,
  dailyUsageListValueCell,
  dailyUsageRangeEnding,
  dailyUsageTokenCell,
  dailyUsageView,
} from './utils/dailyUsage'
export {
  DAILY_USAGE_DEFAULT_DAYS,
  DAILY_USAGE_RANGE_OPTIONS,
  DAILY_USAGE_TEXT,
} from './utils/dailyUsageConstants'
export type {
  DailyUsageAnomalyRow,
  DailyUsageDay,
  DailyUsageModelRow,
  DailyUsageRange,
  DailyUsageStatus,
  DailyUsageToolRow,
  DailyUsageTotal,
  DailyUsageUnattributedRow,
  DailyUsageView,
} from './utils/dailyUsageTypes'

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

// Per-chat CLI-runner binding (attach / detach) + the tool-grant queue — every
// broker ask of the chat, an API turn's and a CLI run's alike — the approval UI renders.
export { useChatCliRunner, type UseChatCliRunner } from './hooks/useChatCliRunner'
export { useActivityChipCli, type ActivityChipCliWiring } from './hooks/useActivityChipCli'
export {
  useChatChipCli,
  type ChatChipCliOverrides,
  type ChatChipCliWiring,
} from './hooks/useChatChipCli'
export { useLaunchAgentPick } from './hooks/useLaunchAgentPick'
export {
  launchAgentPickMetadata,
  launchAgentPickRunner,
  launchAgentPickSuggestionAgent,
  pickLaunchApi,
  pickLaunchCli,
  pickLaunchEffort,
  pickLaunchModel,
} from './utils/launchAgentPick'
export { NO_LAUNCH_AGENT_PICK } from './utils/launchAgentPickConstants'
export type {
  LaunchAgentAsked,
  LaunchAgentPick,
  LaunchAgentPickMetadata,
  LaunchModelChipSlot,
  LaunchSuggestionAgent,
} from './utils/launchAgentPickTypes'
export { useRunModelChip } from './hooks/useRunModelChip'
export {
  processRunModelChipView,
  processRunModelPick,
  runModelChangeBody,
  runModelChipSlot,
  runModelShortLabel,
} from './utils/runModelChange'
export {
  RUN_MODEL_API_LABEL,
  RUN_MODEL_NOTE_NEXT_STEP,
  RUN_MODEL_NOTE_NOW,
  RUN_MODEL_NOTE_WAITING,
  RUN_MODEL_PENDING_SUFFIX,
} from './utils/runModelChangeConstants'
export type {
  RunModelChangeBody,
  RunModelChipSlot,
  RunModelChipView,
  RunModelPending,
} from './utils/runModelChangeTypes'
export { useAgentRunChipCli, type AgentRunChipCliWiring } from './hooks/useAgentRunChipCli'
export { useCliRunArtifact, type UseCliRunArtifact } from './hooks/useCliRunArtifact'
export { usePendingAsksByChat } from './hooks/usePendingAsksByChat'
export {
  useClaimedAsks,
  useInlineApprovals,
  type InlineApprovalRowProps,
  type UseInlineApprovals,
} from './hooks/useInlineApprovals'
export { claimedAskIds, inlineApprovalDecisions } from './utils/inlineApprovals'
export { useHeldAgentMessages, type UseHeldAgentMessages } from './hooks/useHeldAgentMessages'
export { heldAgentMessageViews } from './utils/heldAgentMessages'
export type { HeldAgentMessageView } from './utils/heldAgentMessagesTypes'
export {
  alwaysAllowChoiceView,
  alwaysAllowDecision,
  alwaysAllowScopeOf,
  cliAlwaysAllowScopes,
  decisionGrantScope,
  grantCoversOf,
  grantRuleText,
} from './utils/alwaysAllow'
export * from './utils/alwaysAllowConstants'
export * from './utils/actionRules'
export * from './utils/actionRulesConstants'
export type * from './utils/actionRulesTypes'
export { useActionRules, type UseActionRules } from './hooks/useActionRules'
export { usePendingToolGrants, type UsePendingToolGrants } from './hooks/usePendingToolGrants'

// The chat-rendering diagnostic: one bounded JSON document pairing the chat's
// stored messages and each CLI run's RAW transcript with the steps + messages
// those entries render as.
export { useChatDebugDump, type UseChatDebugDump } from './hooks/useChatDebugDump'
export {
  buildChatDebugDump,
  chatDebugText,
  fitsChatDebugBudget,
  serializeChatDebugDump,
  utf8ByteLength,
} from './utils/chatDebugDump'
export {
  CHAT_DEBUG_DUMP_VERSION,
  CHAT_DEBUG_INTERPRETED_BUDGET_CHARS,
  CHAT_DEBUG_MESSAGES_BUDGET_CHARS,
  CHAT_DEBUG_RAW_TRANSCRIPT_BUDGET_CHARS,
  CHAT_DEBUG_TEXT_PREFIX_CHARS,
} from './utils/chatDebugDumpConstants'
export type {
  ChatDebugCliRun,
  ChatDebugCliRunner,
  ChatDebugCounts,
  ChatDebugDump,
  ChatDebugDumpInput,
  ChatDebugDumpSerialized,
  ChatDebugLimits,
  ChatDebugMessage,
  ChatDebugStep,
  ChatDebugText,
  ChatDebugToolCall,
  ChatDebugToolResult,
} from './utils/chatDebugDumpTypes'

// What a CLI run is doing right now: transcript accumulation for the live view
// plus the single activity line (booting / running <tool> / waiting on you).
export {
  appendCliRunTranscript,
  blockedOnFromGrants,
  blockedToolNames,
  describeCliRunActivity,
  formatCliElapsed,
  lastCliActionAtMs,
  mergeCliRunTranscript,
  runningCliToolNames,
} from './utils/cliRunActivity'
export type {
  CliRunActivity,
  CliRunActivityInput,
  CliRunActivityTone,
  CliRunBlockedOn,
} from './utils/cliRunActivityTypes'
export {
  CLI_BLOCKED_SUBLABEL,
  CLI_BOOT_SUBLABEL,
  CLI_ELAPSED_TICK_MS,
  CLI_QUESTION_SUBLABEL,
  CLI_TRANSCRIPT_CACHE_MAX_RUNS,
  CLI_TRANSCRIPT_FLUSH_MS,
} from './utils/cliRunActivityConstants'
export { CliRunTranscriptCache, cliRunTranscripts } from './utils/cliRunTranscriptCache'
export { applyChatLiveStatePatch, mergeChatLiveState } from './utils/chatLiveState'

// Message deletion. `deleteLastChatMessage` is the only delete the API offers,
// so the control is last-only — and on a CLI turn one stored message owns the
// whole run, which the label has to admit.
export { describeLastMessageDelete, refuseWhileRunActive } from './utils/chatMessageDelete'
export { isGeneralProjectChat, isGeneralGroupChat } from './utils/chatContextGuards'
export {
  CLI_TURN_DELETE_ACTION_LABEL,
  CLI_TURN_DELETE_LABEL,
  MESSAGE_DELETE_LABEL,
} from './utils/chatMessageDeleteConstants'
export type { MessageDeleteControl, MessageDeleteInput } from './utils/chatMessageDeleteTypes'

// Turn restart. Offered only on a chat whose LAST message is the user's — the
// shape a turn leaves behind when the agent never answered it.
export { describeLastUserMessageRestart, isRestartableChatTail } from './utils/chatMessageRestart'
export {
  MESSAGE_RESTART_ACTION_LABEL,
  MESSAGE_RESTART_BUSY_LABEL,
  MESSAGE_RESTART_LABEL,
} from './utils/chatMessageRestartConstants'
export type { MessageRestartControl, MessageRestartInput } from './utils/chatMessageRestartTypes'

// Mid-run `askUser` questions — a broker action answered with text rather than
// approved. Pure parsing / decision mappers behind the question card.
export {
  answerDecision,
  answeredQuestionOf,
  canSubmitAnswer,
  declineDecision,
  isQuestionAction,
  isQuestionGrant,
  parseQuestionPayload,
  partitionGrants,
  splitParkedAsks,
  userAsks,
} from './utils/agentQuestions'
export {
  QUESTION_ACTION_KIND,
  QUESTION_AGENT_DECIDES_ANSWER,
  QUESTION_AGENTS_PICK,
  QUESTION_ANSWER_PLACEHOLDER,
  QUESTION_ANSWERED_BY,
  QUESTION_CARD_TITLE,
  QUESTION_DECLINE_LABEL,
  QUESTION_DECLINED_ANSWER,
  QUESTION_FALLBACK_PROMPT,
  QUESTION_MORE,
  QUESTION_OPTION_SEND,
  QUESTION_PAGER,
  QUESTION_PARK_LABEL,
  QUESTION_PICKER_EMPTY,
  QUESTION_PICKER_FILTER,
  QUESTION_PICKER_LIMIT,
  QUESTION_PICKER_LOADING,
  QUESTION_PICKER_VERB,
  QUESTION_REOPEN_LABEL,
  QUESTION_SOMETHING_ELSE,
  QUESTION_STILL_WAITING,
  QUESTION_SUBMIT_LABEL,
} from './utils/agentQuestionConstants'
export type {
  AgentQuestion,
  AgentQuestionDecision,
  AgentQuestionOption,
  AnsweredQuestionView,
  QuestionPickerItem,
  QuestionPickerKind,
} from './utils/agentQuestionTypes'
export {
  branchPickerItems,
  chatPickerItems,
  featurePickerItems,
  filePickerItems,
  filterPickerItems,
  processPickerItems,
  projectPickerItems,
  storyPickerItems,
  unmatchedOptions,
  withAgentPicks,
} from './utils/questionPicker'
export {
  useContextPickerItems,
  useProcessPickerItems,
  type QuestionPickerItems,
} from './hooks/useQuestionPickerItems'

// One card for every tool that waits on the person — what it wants, the thing
// itself, the agent's reason, a verb on the button.
export {
  featureWorkAskView,
  featureWorkLaunchCheck,
  gitChangeAskView,
  gitSetupAskView,
  groupWorkAskView,
  runProposalAskView,
  toolAskCardView,
  toolAskDecidedLine,
  toolAskDecidedLinesAwaitingRows,
  toolAskScopeOptions,
} from './utils/toolAskCard'
export {
  FEATURE_WORK_ASK,
  GIT_SETUP_ASK,
  GROUP_WORK_ASK,
  RUN_PROPOSAL_ASK,
  TOOL_ASK_COPY,
  TOOL_ASK_PREVIEW_LINES,
  TOOL_ASK_SCOPE,
} from './utils/toolAskCardConstants'
export type {
  ToolAskBody,
  ToolAskCardView,
  ToolAskDecidedLine,
  ToolAskIcon,
  ToolAskLaunchCheck,
  ToolAskScopeOption,
  ToolAskTone,
} from './utils/toolAskCardTypes'

// In-chat credential capture — an agent asks for credentials, the chat renders
// the form, and the client posts the fields straight to the credentials API.
// Only `captureSubmitBody` ever touches the secret, and only to build that
// request; the capture record the hook holds is secret-free by construction.
export { useCredentialCaptures, type UseCredentialCaptures } from './hooks/useCredentialCaptures'
export { captureHelp } from './utils/credentialCaptureHelp'
export {
  awaitingCaptures,
  belongsToChat,
  captureCardTitle,
  capturesBlockedOn,
  captureFields,
  captureFormErrors,
  captureStatusDisplay,
  captureSubmitBody,
  captureToolName,
  emptyCaptureForm,
  isAwaitingUser,
  isCaptureFormValid,
  isCaptureSecretField,
  isCredentialCapture,
  upsertCapture,
} from './utils/credentialCaptures'
export {
  CAPTURE_CANCEL_ERROR,
  CAPTURE_CANCEL_LABEL,
  CAPTURE_CARD_PRIVACY_NOTE,
  CAPTURE_CARD_TITLES,
  CAPTURE_CREDENTIAL_NAME_PREFIX,
  CAPTURE_FIELD_REQUIRED,
  CAPTURE_PURPOSE_LABEL,
  CAPTURE_SUBMIT_ERROR,
  CAPTURE_SUBMIT_LABEL,
  CREDENTIAL_CAPTURE_EVENT,
  CREDENTIAL_CAPTURE_FIELDS,
  CREDENTIAL_CAPTURE_STATUS_DISPLAY,
  CREDENTIAL_CAPTURE_TOOL_NAMES,
} from './utils/credentialCaptureConstants'
export type {
  CredentialCapture,
  CredentialCaptureFieldName,
  CredentialCaptureFieldOption,
  CredentialCaptureFields,
  CredentialCaptureFieldSpec,
  CredentialHelp,
  CredentialCaptureFieldType,
  CredentialCaptureKind,
  CredentialCaptureFormErrors,
  CredentialCaptureFormValues,
  CredentialCaptureStatus,
  CredentialCaptureStatusDisplay,
  CredentialCaptureTone,
} from './utils/credentialCaptureTypes'

// Git credentials (HTTPS PATs / SSH keys) CRUD — any host, not just GitHub.
export {
  GitCredentialsProvider,
  useGitCredentials,
  type GitCredentialsContextValue,
} from './contexts/GitCredentialsContext'
export { formatGitCredentialHost } from './utils/gitCredentials'
export {
  GIT_CREDENTIALS_EMPTY,
  GIT_CREDENTIALS_EVENT,
  GIT_CREDENTIALS_TIP,
  GIT_CREDENTIALS_TITLE,
  GIT_CREDENTIAL_HOST_UNKNOWN,
} from './utils/gitCredentialConstants'
export {
  AGENT_RUNNER_EVENT,
  LLM_CONFIGS_EVENT,
  PROVIDER_CONNECTIONS_EVENT,
  WEB_SEARCH_KEYS_EVENT,
} from './utils/credentialStoreEventConstants'

// Provider connections (Jira / GitHub Issues / … ticket providers) CRUD + the
// B3 connectors: list assigned items + import a ticket into a project as a Story.
export {
  ProviderConnectionsProvider,
  useProviderConnections,
  type ProviderConnectionsContextValue,
  type ProviderConnectionEditInput,
} from './contexts/ProviderConnectionsContext'
// Binding a Jira connection to a group or project: key parsing and the one-line summary.
export {
  chooseTicketConnection,
  describeEffectiveTicketBinding,
  describeTicketBinding,
  effectiveTicketBinding,
  readTicketConnection,
  withTicketConnection,
  formatJiraProjectKeys,
  jiraConnectionsOf,
  parseJiraProjectKeys,
} from './utils/ticketConnection'
export type { EffectiveTicketBinding } from './utils/ticketConnectionTypes'
export {
  TICKET_ACCESS_DESCRIPTIONS,
  TICKET_ACCESS_LABELS,
  TICKET_PICKER_INHERIT,
  TICKET_PICKER_NONE,
} from './utils/ticketConnectionConstants'

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

// Per-project encrypted store of standing context (logins, API keys,
// conventions) an agent can reach for, plus the deliberate one-at-a-time
// reveal of a stored value.
export { useProjectNotes, type UseNotes, type UseProjectNotes } from './hooks/useProjectNotes'
// Design — a project's apps, screens and components, states, versions,
// proposals and tidy-up plans, and its storage usage.
export { useDesign, type UseDesign } from './hooks/useDesign'
export { useDesignPreview, type UseDesignPreview } from './hooks/useDesignPreview'
export { useDesignViewToken } from './hooks/useDesignViewToken'
export { useDesignPlayground, type UseDesignPlayground } from './hooks/useDesignPlayground'
export {
  designPlaygroundFrameUrl,
  designPlaygroundPresetName,
  designPlaygroundSavedAt,
  designPlaygroundSaveTargets,
  designPlaygroundSceneGroups,
} from './utils/designPlayground'
export { useStorageUsage } from './hooks/useStorageUsage'
export {
  designActionsFor,
  designSnapshot,
  designStateOf,
  designViewTokenFor,
  ensureDesign,
  refreshDesign,
  refreshStorageTotals,
  refreshStorageUsage,
  resetDesignStore,
  storageTotalsSnapshot,
  subscribeDesign,
} from './hooks/designStore'
export type {
  DesignActions,
  DesignPlaygroundStatus,
  DesignProjectState,
  DesignProposeEntry,
  DesignSourceChoice,
  DesignUploadInput,
  DesignViewToken,
  StorageTotalsState,
} from './hooks/designStoreTypes'
export {
  designAppNav,
  designAskSummary,
  designCaseMatrix,
  designComponentUsers,
  designDeleteSummary,
  designDiscussDraft,
  designFileTargets,
  designFirstProposal,
  designHistory,
  designOriginText,
  designPreviewShown,
  designProposalGroups,
  designProposalSummary,
  designReferencePreview,
  designSelection,
  designTidyMoveView,
  storageUsageBreakdown,
  storageUsageSummary,
  storageWarningNotification,
} from './utils/designView'
export {
  DESIGN_APP_KIND_LABELS,
  DESIGN_CELL_STATUS_LABELS,
  DESIGN_COMPARE_MARK_LABELS,
  DESIGN_PLAYGROUND_POLL_MS,
  DESIGN_PROPOSAL_STATUS_LABELS,
  DESIGN_TAB_LABELS,
  DESIGN_TEXT,
  DESIGN_TIDY_KIND_LABELS,
  STORAGE_WARNING_TAG,
  STORAGE_WARNING_TEXT,
} from './utils/designViewConstants'
export type {
  DesignAppNav,
  DesignAskSummary,
  DesignCaseMatrix,
  DesignDeleteTarget,
  DesignFileTarget,
  DesignHistoryScreen,
  DesignNavScreen,
  DesignPlaygroundDevice,
  DesignPlaygroundSaveTarget,
  DesignPlaygroundSceneGroup,
  DesignProposalGroup,
  DesignProposalListItem,
  DesignSelection,
  DesignSelectionParams,
  DesignTab,
  DesignTidyMoveView,
  StorageUsageRow,
  StorageWarningNotification,
} from './utils/designViewTypes'
export {
  designContentUrl,
  designShownOfEntry,
  designShownOfVersion,
  designSourceFileName,
  designSourceMediaType,
  designViewKind,
  findDesignScreen,
  findDesignState,
  referenceDesignOf,
  storageUsageFraction,
} from './utils/design'
export type { DesignShown, DesignViewKind } from './utils/designTypes'
export { useGroupNotes } from './hooks/useGroupNotes'
export { referenceGroupId } from './utils/referenceScope'
export { useProjectNoteTexts } from './hooks/useProjectNoteTexts'
export {
  ReferenceRenderingContext,
  useCanonicalizeReferences,
  useEffectiveReferenceRenderer,
  useReferenceRendering,
  type ReferenceRendering,
} from './contexts/ReferenceRenderingContext'
export { useProcesses, type UseProcesses } from './hooks/useProcesses'
export {
  useProcessRun,
  type UseProcessRun,
  type ProcessRunBranch,
  type DeleteProcessRunResult,
  type ProcessRunDelegation,
  type ProcessRunChatOpened,
} from './hooks/useProcessRun'
export { useRunDiagnostics, type UseRunDiagnostics } from './hooks/useRunDiagnostics'
export { useProcessRunClosure, type UseProcessRunClosure } from './hooks/useProcessRunClosure'
export {
  useProcessRunAlreadyLanded,
  type UseProcessRunAlreadyLanded,
} from './hooks/useProcessRunAlreadyLanded'
export {
  processGrantTurnLimitView,
  processLaunchTurnLimitView,
  processRetryChoiceOf,
  processRetryPickStart,
  processRetryTurnLimitView,
  processRunTurnLimitView,
  processTurnLimitOfView,
} from './utils/processTurnLimitView'
export type { ProcessRetryPick, ProcessTurnLimitView } from './utils/processTurnLimitViewTypes'
export {
  PROCESS_RETRY_MODE_HEADING,
  PROCESS_TURN_LIMIT_CHIP,
  PROCESS_TURN_LIMIT_EDIT_LABEL,
  PROCESS_TURN_LIMIT_SAVE_LABEL,
  PROCESS_TURN_LIMIT_SLIDER_LABEL,
} from './utils/processTurnLimitViewConstants'
export { projectManagerSettingsOf, processRunManagerView } from './utils/processManagerView'
export type { ProcessManagerAutonomy, ProcessRunStopHolder } from 'thefactory-tools/types'
export { processRunStopHolder, processRunStopHolderOf } from 'thefactory-tools/utils'
export type {
  ProcessManagerEscalationView,
  ProcessManagerHandledLineView,
  ProcessManagerPreReadView,
  ProcessRunManagerView,
} from './utils/processManagerViewTypes'
export {
  PROCESS_MANAGER_AUTONOMY_LABEL,
  PROCESS_MANAGER_AUTONOMY_OPTIONS,
  PROCESS_MANAGER_PROJECT_DETAIL,
  PROCESS_MANAGER_PROJECT_LABEL,
  PROCESS_MANAGER_DISCUSS_LABEL,
  PROCESS_MANAGER_FOUND_LABEL,
  PROCESS_MANAGER_NEEDS_YOU_TITLE,
  PROCESS_MANAGER_OPEN_CHAT_LABEL,
  PROCESS_MANAGER_PRE_READ_TITLE,
  PROCESS_MANAGER_RECOMMENDS_LABEL,
  PROCESS_MANAGER_TRIED_LABEL,
  PROCESS_MANAGER_WHY_LABEL,
} from './utils/processManagerViewConstants'
export {
  processRunClosureOfRows,
  processRunClosureOptions,
  processRunClosureRows,
  processRunClosureRowsProblem,
  withProcessRunClosurePick,
} from './utils/processRunClosureView'
export type {
  ProcessRunClosureOption,
  ProcessRunClosureRow,
} from './utils/processRunClosureViewTypes'
export {
  processAlreadyLandedOffer,
  processAlreadyOnBaseSignOff,
} from './utils/processAlreadyLanded'
export {
  PROCESS_ALREADY_LANDED_FEATURE_DONE,
  PROCESS_ALREADY_LANDED_FEATURE_STAYS,
  PROCESS_ALREADY_LANDED_FEATURES_HEAD,
} from './utils/processAlreadyLandedConstants'
export type {
  ProcessAlreadyLandedOffer,
  ProcessAlreadyMergedAction,
  ProcessAlreadyOnBaseSignOff,
  ProcessRunLandingPreview,
} from './utils/processAlreadyLandedTypes'
export {
  PROCESS_RETRY_MODE_DETAILS,
  PROCESS_RETRY_MODE_LABELS,
  PROCESS_RUN_CLOSURE_ACTION_COPY,
} from 'thefactory-tools/constants'
export type {
  ProcessFeatureClosure,
  ProcessFeatureClosureCandidate,
  ProcessFeatureClosureStatus,
  ProcessRetryMode,
  ProcessRetryOffer,
  ProcessTurnLimit,
  ProcessTurnLimitOffer,
} from 'thefactory-tools/types'
export { useProcessRuns, type UseProcessRuns } from './hooks/useProcessRuns'
export {
  isProcessRunActive,
  isProcessRunCurrent,
  PROCESS_RUN_ACTIVE_STATUSES,
  splitProcessRunsByCurrent,
} from './utils/processRunCurrent'
export { compareRunsNewestFirst } from './utils/processRunOrder'
export {
  processRunAttentionSection,
  processRunAttentionSections,
  processRunListRow,
  processRunNeedLine,
  processRunWaitingCount,
} from './utils/processRunAttention'
export {
  PROCESS_RUN_ATTENTION_SECTIONS,
  PROCESS_RUN_FRESH_TITLE,
  PROCESS_RUN_WAITING_TITLE,
} from './utils/processRunAttentionConstants'
export type {
  ProcessRunAttentionSection,
  ProcessRunAttentionSectionId,
  ProcessRunListRow,
} from './utils/processRunAttentionTypes'
export { useProcessProposal, type UseProcessProposal } from './hooks/useProcessProposal'
export {
  useProcessGroupRun,
  type UseProcessGroupRun,
  type ProcessGroupRunUpdate,
} from './hooks/useProcessGroupRun'
export {
  useProcessGroupLegLanding,
  type UseProcessGroupLegLanding,
} from './hooks/useProcessGroupLegLanding'
export { useProcessGroupRebuildPlans } from './hooks/useProcessGroupRebuildPlans'
export {
  useProcessGroupRuns,
  shouldTrackProcessGroupRunUpdate,
  type UseProcessGroupRuns,
} from './hooks/useProcessGroupRuns'
export {
  useProcessGroupLaunchPreview,
  type UseProcessGroupLaunchPreview,
} from './hooks/useProcessGroupLaunchPreview'
export {
  isStartGroupWorkGrant,
  processGroupLegWaitsFor,
  startGroupWorkGrantSummary,
} from './utils/processGroupLaunch'
export {
  PROCESS_GROUP_LAUNCH_BLURB,
  START_GROUP_WORK_TOOL_NAME,
} from './utils/processGroupLaunchConstants'
export type {
  ProcessGroupLaunchLeg,
  ProcessGroupLaunchPreview,
  ProcessGroupLegRequest,
  StartGroupWorkGrantSummary,
} from './utils/processGroupLaunchTypes'
export {
  processGroupBadge,
  processGroupCardView,
  processGroupLandedNextView,
  processGroupLandingCheckView,
  processGroupLandingPlanLegIds,
  processGroupLegRows,
  processGroupParkView,
  processGroupProgress,
  processGroupResumeInput,
  processGroupResumeRebuildLegIds,
  processGroupResumeView,
  processGroupWorkMs,
} from './utils/processGroupView'
export { processGroupLegIntegrationModes, processGroupLegMergeGate } from 'thefactory-tools/utils'
export {
  PROCESS_GROUP_CARD_CTA,
  PROCESS_GROUP_LANDING_FEATURES_DONE,
  PROCESS_GROUP_LEG_OPEN_LABEL,
  PROCESS_GROUP_LEG_OPEN_LABELS,
  PROCESS_GROUP_LEG_STATUS_VIEW,
  PROCESS_GROUP_MARK_LANDED_LABEL,
  PROCESS_GROUP_MODE_LABELS,
  PROCESS_GROUP_PARTLY_DONE_BADGE,
  PROCESS_GROUP_RESUME_LABEL,
  PROCESS_GROUP_STOP_CONFIRM_COPY,
} from './utils/processGroupViewConstants'
export type {
  ProcessGroupCardView,
  ProcessGroupLandingCheckView,
  ProcessGroupLegRow,
  ProcessGroupParkView,
  ProcessGroupResumeView,
} from './utils/processGroupViewTypes'
export {
  processProposalView,
  type ProcessProposalView,
  type ProposalChip,
  type ProposalFeatureRow,
} from './utils/processProposalView'
// How a process reads on screen — shared by the `web/` and `native/` peers so
// the two cannot drift on an outcome's name or its status colour.
export {
  PROCESS_KIND_BLURB,
  PROCESS_OUTCOME_VIEW,
  PROCESS_RUN_STATUS_VIEW,
  blankProcessDefinition,
  blankProcessStep,
  copyProcessDefinition,
  isProcessFork,
  parkedRunRef,
  processScopeLabel,
  processStepName,
  processRunChain,
  processRunChipLabel,
  processRunPersonEnding,
  processRunSpend,
  processStepTone,
  processStepFinishedView,
  processStepAgentTypeOfRun,
  processNodeState,
  processNodeTone,
  processNodeGlyph,
  processNodeLook,
  processNodeBadge,
  processNodeSummary,
  PROCESS_LIVE_TONE,
  formatProcessDuration,
  processRunWorkMs,
  processRunWorkLabel,
  processStepWorkMs,
  processStepCostLabel,
  processStepCostTitle,
  processIterationBadge,
  processLoopSenders,
  isProcessRunAtSignOff,
  processRunBadge,
  processRunCardView,
  hasIsolatedAttempts,
  verifyReviewStatus,
  processAttemptLeaf,
  processLeafReview,
  isProcessLeafOpenable,
  latestOpenableAttempt,
  type ProcessStatusTone,
  type ProcessNodeState,
  type ProcessRunCardView,
  type VerifyReviewStatus,
  type ProcessOpenLeaf,
} from './utils/processView'
export type {
  ProcessNodeLook,
  ProcessNodeSummary,
  ProcessRunPersonEnding,
} from './utils/processViewTypes'
export {
  PROCESS_GATE_LOOP_NO_LIMIT,
  PROCESS_PARK_ASK_AGENT_COPY,
  PROCESS_GROUP_RUN_CHIP_GONE,
  PROCESS_GROUP_RUN_CHIP_LOADING,
  PROCESS_RUN_CHIP_GONE,
  PROCESS_RUN_CHIP_LOADING,
  PROCESS_RUN_PERSON_ENDING_VIEW,
  PROCESS_RUN_WORDS,
  PROCESS_REVIVE_COPY,
  PROCESS_SEND_BACK_COPY,
  PROCESS_SPEND_CAP_TITLE,
  PROCESS_STOP_CONFIRM_COPY,
  PROCESS_CLOSE_UNMERGED_CONFIRM_COPY,
  PROCESS_SPEND_TITLE,
} from './utils/processViewConstants'
export {
  choiceTakesNote,
  parkNoteCopy,
  parkNoteCounter,
  parkNoteRequired,
  parkNoteToSend,
  requestProofChoices,
  toggleRequestedProof,
  waitingNoteCopy,
} from './utils/processParkNote'
// What a request for changes starts out requiring is settled once, in
// `thefactory-tools`, so the sign-off and an agent's request require the same.
export { requestChangesProofPreset, uiChangeScopeOf } from 'thefactory-tools/utils'
export {
  PARK_NOTE_CANCEL,
  PARK_NOTE_CHOICES,
  PARK_NOTE_COPY,
  PARK_NOTE_COUNTER_FROM,
  PARK_NOTE_MAX_LENGTH,
  PARK_NOTE_REQUIRED_CHOICES,
  REQUEST_PROOF_CHOICES,
  REQUEST_PROOF_HEADING,
  SEND_TO_DEVELOPER_NOTE_COPY,
  WAITING_NOTE_COPY,
} from './utils/processParkNoteConstants'
export {
  isResumeParkChoice,
  processWaitingDetails,
  processWaitingHeading,
  processWaitingView,
} from './utils/processWaitingView'
export { WAITING_DELEGATED_LABEL } from './utils/processWaitingViewConstants'
export type {
  ProcessWaitingDelegatedView,
  ProcessWaitingDetail,
  ProcessWaitingRequestView,
  ProcessWaitingView,
} from './utils/processWaitingViewTypes'
export type { ParkNoteCopy, RequestProofChoice } from './utils/processParkNoteTypes'
export {
  processCirclingRecommendation,
  processCirclingView,
  processParkCirclingView,
  processStepCirclingView,
} from './utils/processCirclingView'
export * from './utils/processCirclingViewConstants'
export type { ProcessCirclingView } from './utils/processCirclingViewTypes'
export {
  isIntegratingApproval,
  processIntegrationBadge,
  processIntegrationChoices,
  processIntegrationView,
  processRunIntegrationModes,
  soleIntegrationMode,
} from './utils/processIntegration'
export {
  PROCESS_INTEGRATION_BADGE,
  PROCESS_INTEGRATION_CANCEL,
  PROCESS_INTEGRATION_CHOOSER_HEAD,
  PROCESS_INTEGRATION_CHOOSER_NOTE,
  PROCESS_INTEGRATION_COMPARE_LINK,
  PROCESS_INTEGRATION_CONFLICT,
  PROCESS_INTEGRATION_DETAILS_HEAD,
  PROCESS_INTEGRATION_NEVER_TRIED,
  PROCESS_INTEGRATION_SHADOW,
  PROCESS_INTEGRATION_PR_LINK,
  PROCESS_INTEGRATION_RETRY,
  PROCESS_INTEGRATION_RETRY_HEAD,
} from './utils/processIntegrationConstants'
export type {
  ProcessIntegrationChoice,
  ProcessIntegrationView,
} from './utils/processIntegrationTypes'
export {
  processIntegrationAccountLabel,
  processIntegrationFormPreview,
  processIntegrationIdentityLabel,
} from './utils/processIntegrationForm'
// How approved work lands is settled once, in `thefactory-tools`, so the
// sign-off and the agent's approval card start from — and refuse — the same.
export {
  processIntegrationFormDecision,
  processIntegrationFormStart,
  processIntegrationModesOffered,
} from 'thefactory-tools/utils'
export {
  PROCESS_INTEGRATION_FORM_NO_ACCOUNT,
  PROCESS_INTEGRATION_FORM_NO_IDENTITY,
  PROCESS_INTEGRATION_FORM_NO_MESSAGE,
  PROCESS_INTEGRATION_FORM_NO_TITLE,
} from 'thefactory-tools/constants'
export {
  PROCESS_INTEGRATION_CHECK_MERGE,
  PROCESS_INTEGRATION_FORM_LABELS,
} from './utils/processIntegrationFormConstants'
export type { ProcessIntegrationForm, ProcessIntegrationFormResult } from 'thefactory-tools/types'
export type {
  ProcessIntegrationPreview,
  ProcessIntegrationPreviewEntry,
} from './utils/processIntegrationFormTypes'
export {
  useProcessIntegrationOptions,
  type UseProcessIntegrationOptions,
} from './hooks/useProcessIntegrationOptions'
export {
  baseBranchChoice,
  baseBranchChoiceView,
  baseBranchMetadata,
  groupBaseBranchMetadata,
} from './utils/processBaseBranch'
export {
  BASE_BRANCH_ASKED_MISSING,
  BASE_BRANCH_CURRENT_TAG,
  BASE_BRANCH_FOLLOWS_OPEN_RUN,
  BASE_BRANCH_LABEL,
  BASE_BRANCH_NOTE,
  BASE_BRANCH_OTHERS_HEADING,
} from './utils/processBaseBranchConstants'
export type {
  BaseBranchChoiceView,
  BaseBranchMetadata,
  BaseBranchRowView,
  GroupBaseBranchMetadata,
} from './utils/processBaseBranchTypes'
export {
  featureProcessChoice,
  featureProcessLabel,
  featureProcessMetadata,
  featureProcessOptions,
  proposalFeatureProcessId,
} from './utils/processFeatureProcess'
export {
  FEATURE_PROCESS_COPY,
  FEATURE_PROCESS_EXTEND_NOTE,
  FEATURE_PROCESS_FIX_NOTE,
  FEATURE_PROCESS_QUESTION,
  FEATURE_PROCESS_DEFAULT_TAG,
  LAUNCH_HOW_IT_RUNS_HEADING,
} from './utils/processFeatureProcessConstants'
export type {
  FeatureProcessMetadata,
  FeatureProcessOptionView,
} from './utils/processFeatureProcessTypes'
export {
  launchFeatureRows,
  launchProofPlanRows,
  proofKindOptions,
  proofPlanDraftOf,
  proofPlanDraftsEqual,
  proofPlanFieldText,
  proofPlanMarkRows,
  proofPlanMetadata,
  proofPlanOfDraft,
  proofPlanSummaryLine,
  setLaunchProofNotes,
  toggleLaunchProofKind,
  toggleProofPlanDraftKind,
} from './utils/proofPlanView'
export {
  PROOF_KIND_STATUS_TONES,
  PROOF_KIND_STATUS_WORDS,
  PROOF_PLAN_AUTOMATIC_LABEL,
  PROOF_PLAN_CONFIRM_DETAIL,
  PROOF_PLAN_CONFIRM_HEADING,
  PROOF_PLAN_EDITED_LABEL,
  PROOF_PLAN_EDITOR_HINT,
  PROOF_PLAN_EDITOR_LABEL,
  PROOF_PLAN_EMPTY_LABEL,
  PROOF_PLAN_EXTEND_NOTE,
  PROOF_PLAN_INHERITS_PREFIX,
  PROOF_PLAN_NOTES_PLACEHOLDER,
  PROOF_PLAN_SAVE_LABEL,
  PROOF_PLAN_EMPTY_SHORT,
  LAUNCH_FEATURES_HEADING,
  PROOF_PLAN_SIGNOFF_HEADING,
  PROOF_PLAN_SOURCE_LABELS,
} from './utils/proofPlanViewConstants'
export type {
  LaunchProofFlag,
  LaunchProofKindView,
  LaunchProofPlanEdits,
  LaunchProofPlanRow,
  ProofKindOptionView,
  ProofPlanDraft,
  ProofPlanLaunchMetadata,
  ProofPlanMarkRow,
  LaunchFeatureRow,
} from './utils/proofPlanViewTypes'
export {
  proofChangeDraftStart,
  proofChangeView,
  toggleProofChangeKind,
} from './utils/processProofChangeView'
export {
  PROOF_CHANGE_CANCEL_LABEL,
  PROOF_CHANGE_HEADING,
  PROOF_CHANGE_HINT,
  PROOF_CHANGE_NOTE_PLACEHOLDER,
  PROOF_CHANGE_SAVE_LABEL,
  PROOF_CHANGE_SEND_LABEL,
} from './utils/processProofChangeViewConstants'
export type {
  ProofChangeDraft,
  ProofChangeKindView,
  ProofChangeView,
} from './utils/processProofChangeViewTypes'
export {
  processAmendmentView,
  processOpenWorkMetadata,
  processOpenWorkView,
} from './utils/processOpenWork'
export {
  OPEN_WORK_BLOCKED,
  OPEN_WORK_EXTEND_LABEL,
  OPEN_WORK_FRESH_LABEL,
  OPEN_WORK_NEW_ON_BRANCH_LABEL,
  OPEN_WORK_RISKY_TAG,
  OPEN_WORK_PICK_HINT,
  OPEN_WORK_WARNING_PARALLEL,
  OPEN_WORK_WARNING_UNREVIEWED,
} from './utils/processOpenWorkConstants'
export type {
  ProcessAmendmentView,
  ProcessOpenWorkMetadata,
  ProcessOpenWorkOptionView,
  ProcessOpenWorkView,
} from './utils/processOpenWorkTypes'
export { launchOverlapView } from './utils/launchOverlap'
export type { LaunchOverlapView } from './utils/launchOverlapTypes'
export { signoffOutsideScopeLine } from './utils/signoffOutsideScope'
export {
  attemptUiImpactNote,
  reviewUiImpactNote,
  screensDecisionNote,
  screensDecisionUiImpact,
} from './utils/uiImpactView'
export {
  REVIEW_UI_IMPACT_DISAGREES,
  REVIEW_UI_IMPACT_JUDGED,
  SCREENS_DECISION_LABELS,
  UI_IMPACT_HIDDEN_LABEL,
  UI_IMPACT_JUDGE_WORDS,
  UI_IMPACT_SHOWS_LABEL,
} from './utils/uiImpactViewConstants'
export type { ScreensDecisionNote, UiImpactNote, UiImpactTone } from './utils/uiImpactViewTypes'
export type { ChangeScreensDecision } from 'thefactory-tools/types'
// The process engine's pure readers, re-exported so apps reach them through
// `thefactory-ui` rather than importing `thefactory-tools` directly. They must
// agree with the driver's own derivation — `processStepStates` projects a run
// onto the plan the DRIVER froze, so a client-side re-implementation would
// render a pipeline the backend does not agree with.
export {
  isProcessGateLoop,
  isProcessParkChoiceOffered,
  processAlreadyDoneLines,
  isProcessRunParkChoiceOffered,
  isReflectedPark,
  processBaseMovedNote,
  processParkAskableStepId,
  processParkChoices,
  processRunParkChoices,
  processRunProgress,
  processRunRevivable,
  processRunSendBackGateId,
  processStepStates,
  processVerifyReview,
  stepChainSummary,
} from 'thefactory-tools/utils'
export type {
  ProcessBaseConflict,
  ProcessBaseMoved,
  ProcessBaseUpdate,
  ProcessParkChoice,
  ProcessProofChangeOffer,
  ProcessStepState,
  ProcessVerifyReview,
} from 'thefactory-tools/types'
export {
  processNeedsYouItemId,
  processNeedsYouItems,
  processNeedsYouOpenCount,
  processRunChatContext,
  processRunIdOfChatContext,
} from 'thefactory-tools/utils'
export type { ProcessNeedsYouItem, ProcessNeedsYouResolution } from 'thefactory-tools/types'
export {
  runNeedsYouDiscussDraft,
  runNeedsYouOutcome,
  runNeedsYouView,
} from './utils/runNeedsYouView'
export { runPendingChangesView } from './utils/runPendingChangesView'
export {
  RUN_PENDING_CHANGES_START_HINT,
  RUN_PENDING_CHANGE_ADDED,
  RUN_PENDING_CHANGE_REMOVE_LABEL,
  RUN_PENDING_CHANGE_RERUN,
  RUN_PENDING_CHANGE_REWORKED,
} from './utils/runPendingChangesViewConstants'
export type {
  RunPendingChangeItem,
  RunPendingChangesView,
} from './utils/runPendingChangesViewTypes'
export {
  NEEDS_YOU_DISCUSS_LABEL,
  NEEDS_YOU_FINE_LABEL,
  RUN_CHAT_OPEN_LABEL,
  RUN_CHAT_OPENING,
  RUN_CHAT_PLACEHOLDER,
  RUN_CHAT_TITLE,
} from './utils/runNeedsYouViewConstants'
export type {
  NeedsYouCard,
  NeedsYouCardsView,
  RunNeedsYouActions,
} from './utils/runNeedsYouViewTypes'
export { RunNeedsYouProvider, useRunNeedsYou } from './contexts/RunNeedsYouContext'
export {
  RunChatDraftProvider,
  useRunChatDraft,
  type OpenRunChatDraft,
} from './contexts/RunChatDraftContext'
export {
  ChatActionsProvider,
  useChatActions,
  type ChatActions,
} from './contexts/ChatActionsContext'
export {
  capabilityChatDraft,
  capabilitySetupHandler,
  capabilitySetupOffered,
  isCapabilityMethod,
} from './utils/capabilityChatDraft'
export { CAPABILITY_SETUP_LABEL } from './utils/capabilityChatDraftConstants'
export type {
  CapabilityDraftContext,
  CapabilityDraftTarget,
  CapabilityKind,
  CapabilityMethodId,
} from './utils/capabilityChatDraftTypes'
export {
  isRunProposalGrant,
  runProposalArgs,
  runProposalCriteria,
  runProposalHostDetail,
  runProposalOneLine,
  runProposalStartDetail,
  runProposalStepName,
  runProposalToolName,
  runProposalView,
} from './utils/runProposalView'
export {
  runProposalLandingEdits,
  runProposalLandingForm,
  runProposalLandingLine,
  runProposalLandingProblem,
  runProposalLandingWithMode,
} from './utils/runProposalLanding'
export {
  runProposalEdit,
  runProposalEditArgs,
  runProposalEditProblem,
  runProposalEditStart,
} from './utils/runProposalEditView'
export {
  RUN_PROPOSAL_COLLAPSE_LABEL,
  RUN_PROPOSAL_DECLINE_LABEL,
  RUN_PROPOSAL_EXPAND_LABEL,
  RUN_PROPOSAL_LANDING_LABELS,
  RUN_PROPOSAL_LANDING_MODE_LABELS,
  RUN_PROPOSAL_LATER_LABEL,
  RUN_PROPOSAL_OPEN_FULL_LABEL,
  RUN_PROPOSAL_TOOL_NAMES,
} from './utils/runProposalViewConstants'
export type {
  RunProposalKind,
  RunProposalLanding,
  RunProposalSection,
  RunProposalStartDetail,
  RunProposalView,
  RunProposalEdit,
  RunProposalEditState,
} from './utils/runProposalViewTypes'
export { processBaseMovedView } from './utils/processBaseMovedView'
export type { ProcessBaseMovedView } from './utils/processBaseMovedViewTypes'
export { isAgentRunChatContext } from 'thefactory-tools/utils'
export { agentNeverStartedNote, isAgentRunChatKey } from './utils/agentRunTranscript'
export {
  AGENT_NEVER_STARTED,
  AGENT_RUN_TRANSCRIPT_EMPTY,
} from './utils/agentRunTranscriptConstants'
export { AGENT_RUN_TYPES, PROCESS_STEP_KINDS } from 'thefactory-tools/constants'
export type {
  ProcessDefinition,
  ProcessGroupLeg,
  ProcessGroupLegMergeGate,
  ProcessGroupLegRef,
  ProcessGroupLegStatus,
  ProcessGroupPark,
  ProcessGroupParkReason,
  ProcessGroupResumeChoice,
  ProcessGroupResumeInput,
  ProcessGroupRun,
  ProcessGroupRunTotals,
  ProcessIntegrationAccountOption,
  ProcessIntegrationDecision,
  ProcessIntegrationIdentityOption,
  ProcessIntegrationMode,
  ProcessIntegrationOptions,
  ProcessOpenWork,
  ProcessFeatureDelivery,
  ProcessLaunchDecision,
  ProcessOpenWorkChoice,
  ProcessOpenWorkDecision,
  ProcessProposal,
  ProcessRunIntegration,
  ProcessWorkBranch,
  ProcessLedgerEntry,
  ProcessLoop,
  ProcessNodeRunRef,
  ProcessPark,
  ProcessParkReason,
  ProcessPlan,
  ProcessPlanStep,
  ProcessParkAction,
  ProcessResumeChoice,
  ProcessRun,
  ProcessRunStatus,
  ProcessWaitingAsk,
  ProcessWaitingItemChoice,
  ProcessWaitingKind,
  RunDiagnostics,
  RunDiagnosticsEvent,
  ProcessScope,
  ProcessStep,
  ProcessStepKind,
  ProcessStepOutcome,
} from 'thefactory-tools/types'
export { useProjectNoteReveal, type UseProjectNoteReveal } from './hooks/useProjectNoteReveal'
export {
  canRevealNote,
  emptyNoteForm,
  isEmptyNotePatch,
  isNoteFormValid,
  noteAccessHelp,
  noteAccessLabel,
  noteAuthorLabel,
  noteCreateBody,
  noteFormErrors,
  noteFormValues,
  noteKindLabel,
  notePatchBody,
  projectNoteChipView,
  sortNotes,
  linkedNoteState,
} from './utils/projectNotes'
export {
  EMPTY_NOTE_FORM,
  NOTE_ACCESS_HELP,
  NOTE_ACCESS_LABELS,
  NOTE_ACCESS_NOTE,
  NOTE_AGENT_AUTHOR_LABEL,
  NOTE_KIND_HELP,
  NOTE_KIND_LABELS,
  NOTE_LABEL_REQUIRED,
  NOTE_REVEAL_TIMEOUT_MS,
  NOTE_SECRET_HIDDEN,
  NOTE_VALUE_MASK,
  NOTE_VALUE_REQUIRED,
  NOTE_VALUE_UNCHANGED_HINT,
  NOTE_LINK_PARAM,
  NOTE_LINK_MISSING,
} from './utils/projectNotesConstants'
export type {
  LinkedNoteState,
  ProjectNoteChipView,
  ProjectNoteCreateBody,
  ProjectNoteFormErrors,
  ProjectNoteFormMode,
  ProjectNoteFormValues,
  ProjectNotePatchBody,
} from './utils/projectNotesTypes'
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
  buildBridgePush,
  buildBridgeResponse,
  parseBridgeMessage,
  type BridgeRequest,
  type BridgeResponse,
} from './utils/appBridge'
export * from './utils/appBridgeConstants'
export {
  appLiveDataEntry,
  appSourceNotFound,
  appSourceSchedule,
  dataChangedPush,
  declaredSourceId,
  findAppSource,
  liveDataChangedPush,
  parseAppSchedulePayload,
  parseAppSourceId,
  projectSourceId,
  schedulePatch,
  withSourceSchedules,
} from './utils/appLiveData'
export * from './utils/appLiveDataConstants'
export type {
  AppDataChangedPayload,
  AppLiveDataChangedPayload,
  AppLiveDataEntry,
  AppLiveDataSchedule,
  AppLiveDataScheduleRequest,
} from './utils/appLiveDataTypes'
export { currentUserFromCredentials } from './utils/appUser'
export { APP_USER_NONE } from './utils/appUserConstants'
export type { AppCurrentUser, AppUserCredential } from './utils/appUserTypes'
export { AppPushChannel } from './utils/appPushChannel'
export type { AppPushListener } from './utils/appPushChannelTypes'
export { useAppBridgePushes } from './hooks/useAppBridgePushes'
export {
  isWorkStartRequest,
  parseWorkStartPayload,
  workStartDeclined,
  workStartDraftError,
  workStartEditable,
  workStartFeatures,
  workStartStarted,
} from './utils/appWorkStart'
export * from './utils/appWorkStartConstants'
export { AppWorkStartStore } from './utils/appWorkStartStore'
export type {
  AppWorkFeatureDraft,
  AppWorkStartAsk,
  AppWorkStartDraft,
  AppWorkStartListener,
  AppWorkStartProgress,
  AppWorkStartReply,
} from './utils/appWorkStartTypes'
export { useAppWorkStart, type UseAppWorkStart } from './hooks/useAppWorkStart'
export { appDirtyLeaveMessage, isAppDirtyRequest, parseAppDirtyPayload } from './utils/appDirty'
export {
  APP_DIRTY_DEFAULT_MESSAGE,
  APP_DIRTY_MESSAGE,
  APP_DIRTY_TYPE,
} from './utils/appDirtyConstants'
export type { AppDirtyPayload } from './utils/appDirtyTypes'

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
  formToSourcePatch,
  validateSourceForm,
  humanizeMs,
  isSourceFresh,
  isTaskAdapter,
  isTaskSource,
  type LiveDataSourceForm,
} from './utils/liveDataForm'

// Per-project test + coverage runs. Wires the `tests:progress` / `tests:result`
// WS topics into a deferred runner so callers can `await` a unit / coverage
// run and get back the final result.
export {
  TestsProvider,
  useTests,
  useTestsDetail,
  type TestsContextValue,
  type TestsRunKind,
  type TestsRunningJob,
} from './contexts/TestsContext'

// Stories + features for the active project, with dependency resolution
// (display-index → uuid normalisation, blocker lookup). Listens to the
// `stories:updated` WS topic.
export { usePrefetchProjectStories } from './hooks/usePrefetchProjectStories'
export {
  prefetchProjectStories,
  StoriesProvider,
  useStories,
  type StoriesContextValue,
} from './contexts/StoriesContext'
export type {
  DependencyResolution,
  InvalidRefError,
  LoadingRef,
  ResolvedFeatureRef,
  ResolvedRef,
  ResolvedStoryRef,
} from './utils/storyDependencyTypes'
export { dependencyChipOf, featureShownStatus } from './utils/storyDependency'

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
  type AgentsContextValue,
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
  useGitWithLog,
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

export type { RunCliCapabilityCheckResponse } from './api/generated/types.gen.js'

/**
 * Pure SDK values the apps need, re-exported so they reach them through this
 * package rather than taking a second dependency on `thefactory-tools`.
 *
 * ARCHITECTURE.md keeps the direct-thefactory-tools exception deliberately
 * narrow: a pure function with no node dependencies AND a hard "must byte-match
 * the backend's own derivation" justification. These three do not clear that
 * bar — they are ordinary shared values — so they belong here, where one import
 * edge serves all three clients and a change is felt in one place.
 */
export { parseLiteLLMPrices } from 'thefactory-tools/utils'
export { EMPTY_TREE_SHA } from 'thefactory-tools/constants'
export { CHAT_ATTACHMENT_MAX_BYTES } from 'thefactory-tools/constants'
export type { FeatureRequestAcceptance } from 'thefactory-tools/types'

export { isWsReopen } from './utils/wsReconnect'
export { useOnWsReopen } from './hooks/useOnWsReopen'
export {
  gitSetupArgs,
  gitSetupDecisionMetadata,
  gitSetupFormFor,
  gitSetupFormProblem,
  gitSetupMilestone,
  gitSetupPlan,
  isGitSetupGrant,
  toolRowMilestone,
} from './utils/gitSetupApproval'
export {
  GIT_SETUP_COPY,
  GIT_SETUP_TOOL_NAME,
  TOOL_AWAITING_DECISION_LABEL,
} from './utils/gitSetupApprovalConstants'
export { GIT_DIFF_SUPPRESSED_MESSAGE } from './utils/gitDiffConstants'
export type { GitSetupForm, GitSetupPlan, ToolRowMilestone } from './utils/gitSetupApprovalTypes'
export {
  commitReceiptShas,
  commitReceiptView,
  gitChangeArgs,
  gitChangeCard,
  gitChangeDecisionMetadata,
  gitChangeEditValues,
  gitChangeMilestone,
  gitChangeProblem,
  isGitChangeGrant,
  commitReceiptFiles,
} from './utils/gitChangeApproval'
export {
  COMMIT_RECEIPT_COPY,
  GIT_CHANGE_COPY,
  GIT_CHANGE_RUN_BUSY,
  GIT_CHANGE_TOOL_NAMES,
} from './utils/gitChangeApprovalConstants'
export {
  PROCESS_WORK_BRANCH_CHANGES_LABEL,
  processWorkBranchChangeRows,
} from './utils/processWorkBranchChangesView'
export type { ProcessWorkBranchChangeRow } from './utils/processWorkBranchChangesView'
export type {
  CommitReceiptFile,
  CommitReceiptView,
  GitChangeCardView,
  GitChangeCommitView,
  GitChangeEditView,
  GitChangeFileView,
} from './utils/gitChangeApprovalTypes'

export { commitLinkNotice, resolveCommitLink } from './utils/gitCommitLink'
export {
  GIT_COMMIT_LINK_MAX_COMMITS,
  GIT_COMMIT_LINK_MIN_LENGTH,
} from './utils/gitCommitLinkConstants'
export type { GitCommitLinkResolution } from './utils/gitCommitLinkTypes'
export { useGitCommitLink } from './hooks/useGitCommitLink'
export {
  branchMenuItems,
  commitsToBringInLabel,
  mergeBannerTitle,
  mergeBlockedReason,
  mergeChecksOnByDefault,
  mergeChecksView,
  mergeOutcomeLine,
  mergeSentence,
  mergeSourceOptions,
  mergeSourceRef,
} from './utils/gitMerge'
export { GIT_MERGE_TEXT } from './utils/gitMergeConstants'
export type {
  GitBranchMenuAction,
  GitBranchMenuItem,
  GitBranchSection,
  GitMergeChecksView,
  GitMergeOutcomeLine,
  GitMergeSourceOption,
} from './utils/gitMergeTypes'
export type { MergeChecks } from 'thefactory-tools/types'
export { useCommitsToBringIn, type CommitsToBringIn } from './hooks/useCommitsToBringIn'
export {
  chatChangesNotice,
  discardedEditPaths,
  heldChatChangesNote,
  withDiscardWarnings,
} from './utils/chatChangesView'
export { CHAT_CHANGES_COPY } from './utils/chatChangesViewConstants'
export { useProcessCleanup, type UseProcessCleanup } from './hooks/useProcessCleanup'
export {
  processCleanupEditable,
  processCleanupHeadline,
  processCleanupRows,
} from './utils/processCleanupView'
export {
  PROCESS_CLEANUP_BY_LABELS,
  PROCESS_CLEANUP_COPY,
  PROCESS_CLEANUP_KIND_LABELS,
  PROCESS_CLEANUP_OUTCOME_LABELS,
} from './utils/processCleanupViewConstants'
export type { ProcessCleanupRow } from './utils/processCleanupViewTypes'
export {
  storyNoteAuthorLabel,
  storyNoteFormError,
  storyNoteFormValues,
  storyNotePatch,
  storyNotesOf,
} from './utils/storyNotes'
export {
  EMPTY_STORY_NOTE_FORM,
  STORY_NOTE_AUTHOR_LABELS,
  STORY_NOTES_COPY,
} from './utils/storyNotesConstants'
export type { StoryNoteFormValues, StoryNotesTarget } from './utils/storyNotesTypes'
export {
  byChatListAttention,
  chatListBackNotice,
  chatListFilterCounts,
  chatListHiddenNotice,
  chatListPool,
  chatListRow,
  chatListSections,
  isChatInChatList,
  matchesChatListFilter,
  withChatListHidden,
} from './utils/chatList'
export {
  CHAT_LIST_COPY,
  CHAT_LIST_EMPTY,
  CHAT_LIST_FILTERS,
  CHAT_LIST_GROUP_MAIN_TITLE,
  CHAT_LIST_NOTICE_MS,
  CHAT_LIST_SUBS,
  chatListShownNotice,
} from './utils/chatListConstants'
export type {
  ChatListChat,
  ChatListFilter,
  ChatListNotice,
  ChatListRow,
  ChatListRowInput,
  ChatListScope,
  ChatListSection,
  ChatListWork,
} from './utils/chatListTypes'
export { useChatList } from './hooks/useChatList'
export { chatReturnsToList, isChatHiddenFromList } from 'thefactory-tools/utils'
export { listDropSide, listReorderToIndex } from './utils/listReorder'
export {
  listDragSlot,
  listMoveTarget,
  listRowShift,
  listSettleOffset,
  listSlotTops,
} from './utils/listDragSlots'
export type { ListDropSide, ListDropTarget } from './utils/listReorderTypes'
export {
  launchSuggestionBody,
  launchSuggestionPicks,
  launchSuggestionProofEdits,
  launchSuggestionRows,
  workLaunchChatAgent,
  workLaunchOptions,
} from './utils/workLaunchView'
export * from './utils/workLaunchViewConstants'
export type {
  LaunchSuggestionBody,
  LaunchSuggestionInput,
  LaunchSuggestionPicks,
  LaunchSuggestionRow,
  WorkLaunchChoice,
  WorkLaunchOptionView,
} from './utils/workLaunchViewTypes'
export { storyLaunchGrant, type StoryLaunchGrantInput } from './utils/storyLaunchGrant'
export {
  startStoryWorkRequest,
  useLaunchSuggestion,
  useProjectWorkLaunch,
  type LaunchSuggestionState,
  type StoryWorkStarted,
} from './hooks/useWorkLaunch'
export { startRequestWork } from './hooks/useCrossProjectRequests'
export { useStartWork, type StartWorkState } from './hooks/useStartWork'
export type { StartWorkOutcome, StartWorkTarget } from './utils/workLaunchViewTypes'
export { useFeatureRequestStart, type FeatureRequestStart } from './hooks/useFeatureRequestStart'
