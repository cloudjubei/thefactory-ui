import type {
  ChatContext,
  CompactChatNowData,
  CompactChatNowResponse,
  CountPendingCliAgentActionsByChatData,
  CountPendingCliAgentActionsByChatResponse,
  GetActiveCliStateData,
  GetActiveCliStateResponse,
  GetActiveRunnerKindData,
  GetActiveRunnerKindResponse,
  GetAllFileStatsData,
  GetAllFileStatsResponse,
  GetChatContextReadoutData,
  GetChatContextReadoutResponse,
  GetChatData,
  GetChatOpenChangesData,
  GetChatOpenChangesResponse,
  GetChatResponse,
  GetChatsSettingsData,
  GetChatsSettingsResponse,
  GetChatSummaryData,
  GetChatSummaryResponse,
  GetChatTurnData,
  GetChatTurnResponse,
  GetCostsByChatData,
  GetCostsByChatResponse,
  GetCliAgentRunData,
  GetCliAgentRunResponse,
  GetDailyUsageData,
  GetDailyUsageResponse,
  GetDbHealthData,
  GetDbHealthResponse,
  GetDesignPlaygroundData,
  GetDesignPlaygroundResponse,
  GetGitBundleData,
  GetGitBundleResponse,
  GetGitLocalDiffData,
  GetGitLocalDiffResponse,
  GetGitLogData,
  GetGitLogResponse,
  GetKnowledgeEvaluationSettingsData,
  GetKnowledgeEvaluationSettingsResponse,
  GetLastCoverageData,
  GetLastCoverageResponse,
  GetLastTestsCustomRunData,
  GetLastTestsCustomRunResponse,
  GetLastTestsRunData,
  GetLastTestsRunResponse,
  GetOverseerData,
  GetOverseerResponse,
  GetPricingData,
  GetPricingResponse,
  GetProjectsGroupConstellationData,
  GetProjectsGroupConstellationResponse,
  GetProjectsGroupStatusData,
  GetProjectsGroupStatusResponse,
  GetProcessCapabilitiesData,
  GetProcessCapabilitiesResponse,
  GetProcessRunData,
  GetProcessRunEvidenceData,
  GetProcessRunEvidenceResponse,
  PreviewProcessRunData,
  PreviewProcessRunResponse,
  GetProcessRunStatisticsData,
  GetProcessRunStatisticsResponse,
  GetProcessRunResponse,
  GetProjectDesignData,
  GetProjectDesignResponse,
  GetProjectKnowledgeOverviewData,
  GetProjectKnowledgeOverviewResponse,
  GetProjectStorageUsageData,
  GetProjectStorageUsageResponse,
  GetStoriesOrderData,
  GetStoriesOrderResponse,
  GetStorageUsageData,
  GetStorageUsageResponse,
  GetStoryData,
  GetStoryResponse,
  GetUserSettingData,
  GetUserSettingResponse,
  HealthData,
  HealthResponse,
  HealthStartupData,
  HealthStartupResponse,
  ListActionRulesData,
  ListActionRulesResponse,
  ListActivitiesData,
  ListActivitiesResponse,
  ListChatSummariesData,
  ListChatSummariesResponse,
  ListChatToolCatalogData,
  ListChatToolCatalogResponse,
  ListCliAgentModelsData,
  ListCliAgentModelsResponse,
  ListCliAgentRunSummariesData,
  ListCliAgentRunSummariesResponse,
  ListCliAuthCachesData,
  ListCliAuthCachesResponse,
  ListCliCapabilityScorecardsData,
  ListCliCapabilityScorecardsResponse,
  CheckCliImageUpdatesData,
  CheckCliImageUpdatesResponse,
  ListCliImageVersionsData,
  ListCliImageVersionsResponse,
  ListCredentialCapturesData,
  ListCredentialCapturesResponse,
  ListDataSourcesData,
  ListDataSourcesResponse,
  ListDecidedCliAgentActionsData,
  ListDecidedCliAgentActionsResponse,
  ListEntitiesData,
  ListEntitiesResponse,
  ListFeatureRequestsData,
  ListFeatureRequestsResponse,
  ListGitCredentialsData,
  ListGitCredentialsResponse,
  ListGroupAgentTypesData,
  ListGroupAgentTypesResponse,
  ListGroupNotesData,
  ListGroupNotesResponse,
  ListGroupStoriesData,
  ListGroupStoriesResponse,
  ListLlmConfigsData,
  ListLlmConfigsResponse,
  ListOverseerAuthProvidersData,
  ListOverseerAuthProvidersResponse,
  ListPendingCliAgentActionsData,
  ListPendingCliAgentActionsResponse,
  ListProcessesData,
  ListProcessesResponse,
  ListProcessGroupRunsData,
  ListProcessGroupRunsResponse,
  ListProcessRunsData,
  ListProcessRunsResponse,
  ListProjectAgentTypesData,
  ListProjectAgentTypesResponse,
  ListProjectDataData,
  ListProjectDataResponse,
  ListProjectDataSubscriptionsData,
  ListProjectDataSubscriptionsResponse,
  ListProjectGroupStoriesData,
  ListProjectGroupStoriesResponse,
  ListProjectNotesData,
  ListProjectNotesResponse,
  ListProjectsData,
  ListProjectsGroupsData,
  ListProjectsGroupsResponse,
  ListProjectsResponse,
  ListProviderConnectionsData,
  ListProviderConnectionsResponse,
  ListSourceRecordsData,
  ListSourceRecordsResponse,
  ListStoriesData,
  ListStoriesResponse,
  ListStoryGroupStoriesData,
  ListStoryGroupStoriesResponse,
  ListTemplatesData,
  ListTemplatesResponse,
  ListTestConfigCandidatesData,
  ListTestConfigCandidatesResponse,
  ListTestsData,
  ListTestsResponse,
  ListToolsData,
  ListToolsResponse,
  ListWebSearchKeysData,
  ListWebSearchKeysResponse,
} from '../headless/api/generated/types.gen'
import { FAKE_BACKEND_VERSION } from './fakeBackendConstants'
import type { FakeRoute, FakeRouteMethod, FakeRouteRequest } from './fakeBackendTypes'
import { fakeChatToolCatalog } from './fakeChatToolCatalog'
import {
  FAKE_CLI_AUTH_CACHES,
  FAKE_CLI_IMAGES,
  FAKE_CLI_STATE,
  FAKE_DB_HEALTH,
  FAKE_GIT_CREDENTIALS,
  FAKE_GROUP_NOTES,
  FAKE_GROUP_STORIES,
  FAKE_KNOWLEDGE_EVALUATION,
  FAKE_OVERSEER,
  FAKE_PROJECT_NOTES,
  FAKE_STORAGE_USAGE,
  FAKE_TEST_PATHS,
  FAKE_TESTS_RESULT,
  FAKE_WEB_SEARCH_KEYS,
  fakeProjectStorageUsage,
} from './fixtures/account'
import { GROUP_DATA, PROJECT_DATA } from './fixtures/agentTypes'
import {
  FAKE_VARIANT_PROCESS,
  FAKE_VARIANT_RUN_ID,
  fakeVariantEvidence,
  fakeVariantPreview,
  fakeVariantRun,
} from './fixtures/variantRun'
import { FAKE_CLI_RUN } from './fixtures/cliRuns'
import {
  FAKE_CHAT_SETTINGS,
  FAKE_CHATS,
  fakeChatOf,
  fakeChatSummaryOf,
  findFakeChat,
} from './fixtures/chats'
import { FAKE_CONTEXT_READOUT } from './fixtures/chatContext'
import { PLAY_INDEX } from './fixtures/design'
import { FAKE_FEATURE_REQUESTS } from './fixtures/featureRequests'
import { fakeGitBundle, LOG } from './fixtures/git'
import { codeOnlyOverview } from './fixtures/knowledge'
import { FAKE_DATA_SUBSCRIPTIONS, FAKE_SOURCE_RECORDS, TASK_SOURCE } from './fixtures/liveData'
import { API_CONFIG, CLI_MODELS, FAKE_LLM_CONFIGS } from './fixtures/models'
import {
  FAKE_PROCESS_RUN_STATISTICS,
  FAKE_PROCESS_RUNS,
  FAKE_PROCESSES,
  fakeProcessRunsMatching,
} from './fixtures/processRuns'
import { FAKE_GROUP_ID, FAKE_GROUPS, FAKE_PROJECTS } from './fixtures/projects'
import { FAKE_GROUP_CONSTELLATION, FAKE_GROUP_STATUS } from './fixtures/projectsGroups'
import { FAKE_AT } from './fixtures/stamps'
import { FAKE_STORIES_BY_PROJECT } from './fixtures/stories'

const FAKE_JIRA_CLOUD_ID = '11111111-2222-4333-8444-555555555555'

type ContractData = { url: string }

/**
 * One route, typed by the operation it fakes: `TData['url']` holds it to the
 * contract's path and `TResponse` its answer to the contract's body, so a change
 * to the API fails here instead of drifting.
 */
const route =
  (method: FakeRouteMethod) =>
  <TData extends ContractData, TResponse>(
    path: TData['url'],
    answer: (request: FakeRouteRequest) => TResponse,
  ): FakeRoute => ({ method, path, answer })

const read = route('GET')
const readByPost = route('POST')

const publicRead = <TData extends ContractData, TResponse>(
  path: TData['url'],
  answer: (request: FakeRouteRequest) => TResponse,
): FakeRoute => ({ method: 'GET', path, isPublic: true, answer })

const storiesOf = (projectId: string | undefined) => FAKE_STORIES_BY_PROJECT[projectId ?? ''] ?? []

function contextOf({ body, missing }: FakeRouteRequest): ChatContext {
  const { context } = (body ?? {}) as { context?: ChatContext }
  return context ?? missing('The request names no chat context.')
}

const HEALTH: HealthResponse = {
  status: 'ok',
  version: FAKE_BACKEND_VERSION,
  uptime: 0,
  sandbox: { docker: 'ok', images: {} },
  fd: { soft: 'unlimited', hard: 'unlimited' },
  libuv: { totalHandles: 0, activeHandles: 0, byType: {} },
  spawn: { transientRetryCount: 0, transientRetryGiveUpCount: 0 },
  sessionLane: {
    liveChildren: 0,
    peakLiveChildren: 0,
    totalSpawned: 0,
    maxLiveChildren: 0,
    ceilingRejections: 0,
    liveByLabel: {},
    peakByLabel: {},
  },
}

const STARTUP: HealthStartupResponse = {
  serving: true,
  ready: true,
  searchIndex: {
    state: 'ready',
    projectsDone: FAKE_PROJECTS.length,
    projectsTotal: FAKE_PROJECTS.length,
  },
  knowledgeMaps: {
    state: 'ready',
    projectsDone: FAKE_PROJECTS.length,
    projectsTotal: FAKE_PROJECTS.length,
    queued: 0,
    failed: [],
  },
  legacyNotes: { state: 'done', stores: [] },
}

const NO_COSTS: Omit<GetCostsByChatResponse, 'chatKey'> = {
  totalCostUSD: 0,
  totalPromptTokens: 0,
  totalCompletionTokens: 0,
  totalCachedReadInputTokens: 0,
  breakdown: {},
}

/** Every read the clients make to reach their main screens. Nothing here writes. */
export const FAKE_BACKEND_ROUTES: readonly FakeRoute[] = [
  publicRead<HealthData, HealthResponse>('/health', () => HEALTH),
  publicRead<HealthStartupData, HealthStartupResponse>('/health/startup', () => STARTUP),

  read<ListLlmConfigsData, ListLlmConfigsResponse>('/api/v1/llm-configs', () => FAKE_LLM_CONFIGS),
  read<GetActiveRunnerKindData, GetActiveRunnerKindResponse>('/api/v1/agent-runner/active', () => ({
    activeRunnerKind: 'api',
    activeLlmConfigId: API_CONFIG.id,
  })),
  read<ListCliAuthCachesData, ListCliAuthCachesResponse>(
    '/api/v1/cli-auth-caches',
    () => FAKE_CLI_AUTH_CACHES,
  ),
  read<GetActiveCliStateData, GetActiveCliStateResponse>(
    '/api/v1/cli-configs/active',
    () => FAKE_CLI_STATE,
  ),
  read<ListCliCapabilityScorecardsData, ListCliCapabilityScorecardsResponse>(
    '/api/v1/cli-runs/probe/capability',
    () => [],
  ),
  read<ListCliImageVersionsData, ListCliImageVersionsResponse>(
    '/api/v1/cli-images',
    () => FAKE_CLI_IMAGES,
  ),
  readByPost<CheckCliImageUpdatesData, CheckCliImageUpdatesResponse>(
    '/api/v1/cli-images/check',
    () => FAKE_CLI_IMAGES,
  ),
  read<ListCliAgentModelsData, ListCliAgentModelsResponse>(
    '/api/v1/cli-runs/probe/models',
    ({ query }) => ({
      models: CLI_MODELS.filter((model) => model.cli === query.get('cli')),
      efforts: ['low', 'medium', 'high'],
    }),
  ),
  read<ListGitCredentialsData, ListGitCredentialsResponse>(
    '/api/v1/git-credentials',
    () => FAKE_GIT_CREDENTIALS,
  ),
  read<ListWebSearchKeysData, ListWebSearchKeysResponse>(
    '/api/v1/web-search-keys',
    () => FAKE_WEB_SEARCH_KEYS,
  ),
  read<ListProviderConnectionsData, ListProviderConnectionsResponse>(
    '/api/v1/provider-connections',
    () => [],
  ),
  {
    method: 'GET',
    path: '/api/v1/provider-connections/jira-cloud-id',
    answer: () => ({ cloudId: FAKE_JIRA_CLOUD_ID }),
  },
  read<GetOverseerData, GetOverseerResponse>('/api/v1/overseer', () => FAKE_OVERSEER),
  read<ListOverseerAuthProvidersData, ListOverseerAuthProvidersResponse>(
    '/api/v1/overseer/auth-providers',
    () => ({ providers: ['github'], githubFlows: ['device'] }),
  ),
  read<ListProjectsData, ListProjectsResponse>('/api/v1/projects', () => FAKE_PROJECTS),
  read<ListProjectsGroupsData, ListProjectsGroupsResponse>(
    '/api/v1/projects-groups',
    () => FAKE_GROUPS,
  ),
  read<GetProjectsGroupStatusData, GetProjectsGroupStatusResponse>(
    '/api/v1/projects-groups/{id}/status',
    ({ params, missing }) =>
      params.id === FAKE_GROUP_ID ? FAKE_GROUP_STATUS : missing(`No fake group '${params.id}'.`),
  ),
  read<GetProjectsGroupConstellationData, GetProjectsGroupConstellationResponse>(
    '/api/v1/projects-groups/{id}/constellation',
    ({ params, missing }) =>
      params.id === FAKE_GROUP_ID
        ? FAKE_GROUP_CONSTELLATION
        : missing(`No fake group '${params.id}'.`),
  ),
  read<ListTemplatesData, ListTemplatesResponse>('/api/v1/templates', () => ({ templates: [] })),
  read<GetPricingData, GetPricingResponse>('/api/v1/pricing', () => ({
    updatedAt: FAKE_AT,
    prices: [],
  })),
  read<ListToolsData, ListToolsResponse>('/api/v1/tools', () => []),
  read<ListEntitiesData, ListEntitiesResponse>('/api/v1/entities', () => []),
  read<GetUserSettingData, GetUserSettingResponse>('/api/v1/settings/{key}', () => ({
    value: null,
  })),
  read<GetDailyUsageData, GetDailyUsageResponse>('/api/v1/usage/daily', ({ query }) => ({
    fromDay: query.get('fromDay') ?? FAKE_AT,
    toDay: query.get('toDay') ?? FAKE_AT,
    summaries: [],
  })),
  read<GetStorageUsageData, GetStorageUsageResponse>(
    '/api/v1/storage-usage',
    () => FAKE_STORAGE_USAGE,
  ),
  read<GetDbHealthData, GetDbHealthResponse>('/api/v1/db/health', () => FAKE_DB_HEALTH),

  read<ListStoriesData, ListStoriesResponse>('/api/v1/projects/{projectId}/stories', ({ params }) =>
    storiesOf(params.projectId),
  ),
  read<GetStoriesOrderData, GetStoriesOrderResponse>(
    '/api/v1/projects/{projectId}/stories/order',
    ({ params }) => storiesOf(params.projectId).map((story) => story.id),
  ),
  read<GetStoryData, GetStoryResponse>(
    '/api/v1/projects/{projectId}/stories/{storyId}',
    ({ params, missing }) =>
      storiesOf(params.projectId).find((story) => story.id === params.storyId) ??
      missing(`No fake story '${params.storyId}' in '${params.projectId}'.`),
  ),
  read<ListProjectGroupStoriesData, ListProjectGroupStoriesResponse>(
    '/api/v1/projects/{projectId}/group-stories',
    () => ({}),
  ),
  read<ListStoryGroupStoriesData, ListStoryGroupStoriesResponse>(
    '/api/v1/projects/{projectId}/stories/{storyId}/group-stories',
    () => [],
  ),
  read<GetAllFileStatsData, GetAllFileStatsResponse>(
    '/api/v1/projects/{projectId}/files/stats',
    () => [],
  ),
  read<GetGitBundleData, GetGitBundleResponse>(
    '/api/v1/projects/{projectId}/git/bundle',
    ({ query }) => fakeGitBundle(Number(query.get('maxCount') ?? LOG.length)),
  ),
  read<GetGitLogData, GetGitLogResponse>('/api/v1/projects/{projectId}/git/log', () => ({
    commits: LOG,
  })),
  readByPost<GetGitLocalDiffData, GetGitLocalDiffResponse>(
    '/api/v1/projects/{projectId}/git/local-diff',
    () => [],
  ),
  read<GetLastTestsRunData, GetLastTestsRunResponse>(
    '/api/v1/projects/{projectId}/tests/last-run',
    () => FAKE_TESTS_RESULT,
  ),
  read<GetLastTestsCustomRunData, GetLastTestsCustomRunResponse>(
    '/api/v1/projects/{projectId}/tests/last-custom-run',
    () => null,
  ),
  read<GetLastCoverageData, GetLastCoverageResponse>(
    '/api/v1/projects/{projectId}/tests/last-coverage',
    () => null,
  ),
  read<ListTestsData, ListTestsResponse>(
    '/api/v1/projects/{projectId}/tests/list',
    () => FAKE_TEST_PATHS,
  ),
  read<ListTestConfigCandidatesData, ListTestConfigCandidatesResponse>(
    '/api/v1/projects/{projectId}/tests/config-candidates',
    () => [],
  ),
  read<ListProjectDataData, ListProjectDataResponse>('/api/v1/projects/{projectId}/data', () => []),
  read<ListActivitiesData, ListActivitiesResponse>(
    '/api/v1/projects/{projectId}/activities',
    () => ({ activities: [] }),
  ),
  read<ListProjectNotesData, ListProjectNotesResponse>(
    '/api/v1/projects/{projectId}/notes',
    ({ params }) => FAKE_PROJECT_NOTES.filter((note) => note.projectId === params.projectId),
  ),
  read<GetProjectKnowledgeOverviewData, GetProjectKnowledgeOverviewResponse>(
    '/api/v1/projects/{projectId}/knowledge/overview',
    () => ({ overview: codeOnlyOverview(), hasCheckout: true }),
  ),
  read<GetKnowledgeEvaluationSettingsData, GetKnowledgeEvaluationSettingsResponse>(
    '/api/v1/projects/{projectId}/knowledge-evaluation/settings',
    () => FAKE_KNOWLEDGE_EVALUATION,
  ),
  read<GetProjectDesignData, GetProjectDesignResponse>(
    '/api/v1/projects/{projectId}/design',
    () => PLAY_INDEX,
  ),
  read<GetDesignPlaygroundData, GetDesignPlaygroundResponse>(
    '/api/v1/projects/{projectId}/design/playground',
    () => ({ status: 'none' }),
  ),
  read<GetProjectStorageUsageData, GetProjectStorageUsageResponse>(
    '/api/v1/projects/{projectId}/storage-usage',
    ({ params }) => fakeProjectStorageUsage(params.projectId ?? ''),
  ),
  read<ListProjectAgentTypesData, ListProjectAgentTypesResponse>(
    '/api/v1/projects/{projectId}/agent-types',
    () => PROJECT_DATA,
  ),
  read<ListProjectDataSubscriptionsData, ListProjectDataSubscriptionsResponse>(
    '/api/v1/projects/{projectId}/live-data/subscriptions',
    ({ params }) => FAKE_DATA_SUBSCRIPTIONS.filter((sub) => sub.projectId === params.projectId),
  ),
  read<ListDataSourcesData, ListDataSourcesResponse>('/api/v1/live-data/sources', () => [
    TASK_SOURCE,
  ]),
  read<ListSourceRecordsData, ListSourceRecordsResponse>(
    '/api/v1/live-data/sources/{id}/records',
    () => FAKE_SOURCE_RECORDS,
  ),

  read<ListGroupNotesData, ListGroupNotesResponse>('/api/v1/groups/{groupId}/notes', ({ params }) =>
    FAKE_GROUP_NOTES.filter((note) => note.groupId === params.groupId),
  ),
  read<ListGroupStoriesData, ListGroupStoriesResponse>(
    '/api/v1/groups/{groupId}/group-stories',
    ({ params }) => FAKE_GROUP_STORIES.filter((story) => story.groupId === params.groupId),
  ),
  read<ListGroupAgentTypesData, ListGroupAgentTypesResponse>(
    '/api/v1/groups/{groupId}/agent-types',
    () => GROUP_DATA,
  ),

  read<ListChatSummariesData, ListChatSummariesResponse>('/api/v1/chats/summaries', () =>
    FAKE_CHATS.map(fakeChatSummaryOf),
  ),
  read<GetChatsSettingsData, GetChatsSettingsResponse>(
    '/api/v1/chats/settings',
    () => FAKE_CHAT_SETTINGS,
  ),
  readByPost<GetChatContextReadoutData, GetChatContextReadoutResponse>(
    '/api/v1/chats/context-readout',
    () => FAKE_CONTEXT_READOUT,
  ),
  readByPost<CompactChatNowData, CompactChatNowResponse>('/api/v1/chats/compact-now', () => ({
    outcome: 'nothing-needed',
  })),
  readByPost<GetChatData, GetChatResponse>('/api/v1/chats/get', (request) =>
    fakeChatOf(contextOf(request)),
  ),
  readByPost<GetChatSummaryData, GetChatSummaryResponse>('/api/v1/chats/summary', (request) => {
    const context = contextOf(request)
    const chat = findFakeChat(context)
    return chat
      ? fakeChatSummaryOf(chat)
      : request.missing(`No fake chat for ${JSON.stringify(context)}.`)
  }),
  read<ListChatToolCatalogData, ListChatToolCatalogResponse>(
    '/api/v1/tools/chat-catalog',
    ({ query }) => fakeChatToolCatalog(Object.fromEntries(query)),
  ),
  read<GetCostsByChatData, GetCostsByChatResponse>('/api/v1/costs/{chatKey}', ({ params }) => ({
    ...NO_COSTS,
    chatKey: params.chatKey ?? '',
  })),
  read<GetChatTurnData, GetChatTurnResponse>('/api/v1/completions/turn', () => ({ active: false })),
  read<GetChatOpenChangesData, GetChatOpenChangesResponse>('/api/v1/chat-open-changes', () => ({
    openChanges: null,
  })),
  read<ListActionRulesData, ListActionRulesResponse>('/api/v1/action-rules', () => ({ rules: [] })),
  read<ListFeatureRequestsData, ListFeatureRequestsResponse>(
    '/api/v1/feature-requests',
    () => FAKE_FEATURE_REQUESTS,
  ),
  read<ListCredentialCapturesData, ListCredentialCapturesResponse>(
    '/api/v1/credential-captures',
    () => [],
  ),
  read<CountPendingCliAgentActionsByChatData, CountPendingCliAgentActionsByChatResponse>(
    '/api/v1/cli-runs/actions/pending-by-chat',
    () => ({ counts: {} }),
  ),
  read<ListPendingCliAgentActionsData, ListPendingCliAgentActionsResponse>(
    '/api/v1/cli-runs/actions',
    () => [],
  ),
  read<ListDecidedCliAgentActionsData, ListDecidedCliAgentActionsResponse>(
    '/api/v1/cli-runs/actions/decided',
    () => [],
  ),
  read<ListCliAgentRunSummariesData, ListCliAgentRunSummariesResponse>(
    '/api/v1/cli-runs/summaries',
    () => [],
  ),

  read<GetCliAgentRunData, GetCliAgentRunResponse>(
    '/api/v1/cli-runs/{runId}',
    ({ params, missing }) =>
      params.runId === FAKE_CLI_RUN.id
        ? FAKE_CLI_RUN
        : missing(`No fake CLI run '${params.runId}'.`),
  ),
  read<GetProcessRunStatisticsData, GetProcessRunStatisticsResponse>(
    '/api/v1/process-runs/statistics',
    () => FAKE_PROCESS_RUN_STATISTICS,
  ),
  read<ListProcessRunsData, ListProcessRunsResponse>('/api/v1/process-runs', ({ query }) =>
    fakeProcessRunsMatching(query),
  ),
  {
    method: 'GET',
    path: '/api/v1/process-runs/{runId}/ticket-post',
    answer: () => ({ tickets: [] }),
  },
  read<GetProcessRunEvidenceData, GetProcessRunEvidenceResponse>(
    '/api/v1/process-runs/{runId}/evidence',
    ({ params }) =>
      params.runId === FAKE_VARIANT_RUN_ID
        ? fakeVariantEvidence('done')
        : { runId: params.runId ?? '', groups: [] },
  ),
  {
    method: 'GET',
    path: '/api/v1/process-runs/{runId}/integration-options',
    answer: () => ({
      title: 'Sign-up trial',
      commits: [],
      fastForward: true,
      identities: [],
      accounts: [],
      defaults: {},
      nothingToMerge: true,
    }),
  },
  readByPost<PreviewProcessRunData, PreviewProcessRunResponse>(
    '/api/v1/process-runs/preview',
    () => fakeVariantPreview() as PreviewProcessRunResponse,
  ),
  { method: 'POST', path: '/api/v1/process-runs', answer: () => fakeVariantRun('running') },
  read<GetProcessRunData, GetProcessRunResponse>(
    '/api/v1/process-runs/{runId}',
    ({ params, missing }) =>
      (params.runId === FAKE_VARIANT_RUN_ID ? fakeVariantRun('done') : undefined) ??
      FAKE_PROCESS_RUNS.find((run) => run.id === params.runId) ??
      missing(`No fake run '${params.runId}'.`),
  ),
  read<ListProcessesData, ListProcessesResponse>('/api/v1/processes', () => [
    ...FAKE_PROCESSES,
    FAKE_VARIANT_PROCESS,
  ]),
  read<GetProcessCapabilitiesData, GetProcessCapabilitiesResponse>(
    '/api/v1/processes/capabilities',
    () => ({ kinds: ['agent', 'check', 'gate'], implemented: ['agent', 'check', 'gate'] }),
  ),
  read<ListProcessGroupRunsData, ListProcessGroupRunsResponse>(
    '/api/v1/process-group-runs',
    () => [],
  ),
]
