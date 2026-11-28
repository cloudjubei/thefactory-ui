import type { ProcessRun } from 'thefactory-tools/types'
import type {
  AnswerRunThroughIssueData,
  AnswerRunThroughIssueResponse,
  AddChatMessagesData,
  AddChatMessagesResponse,
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
  GetDbDockerDiskData,
  GetDbDockerDiskResponse,
  ClearDbDockerSpaceData,
  ClearDbDockerSpaceResponse,
  ResizeDbDockerDiskData,
  ResizeDbDockerDiskResponse,
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
  FinishRunThroughIssueReviewData,
  FinishRunThroughIssueReviewResponse,
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
  GetProjectDeviceAutomationData,
  GetProjectDeviceAutomationResponse,
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
  CheckProjectTemplateUpdatesData,
  CheckProjectTemplateUpdatesResponse,
  ListCliImageVersionsData,
  ListCliImageVersionsResponse,
  ListConnectionAssignedItemsData,
  ListConnectionAssignedItemsResponse,
  ListConnectionNewItemsData,
  ListConnectionNewItemsResponse,
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
  ListGroupMcpServersData,
  ListGroupMcpServersResponse,
  ListGroupMcpServerStatusData,
  ListGroupMcpServerStatusResponse,
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
  ListProjectMcpServersData,
  ListProjectMcpServersResponse,
  ListProjectMcpServerStatusData,
  ListProjectMcpServerStatusResponse,
  ListProjectNotesData,
  ListProjectNotesResponse,
  ListProjectsData,
  ListProjectsGroupsData,
  ListProjectsGroupsResponse,
  ListProjectsResponse,
  ListProviderConnectionsData,
  ListReviewEvidenceData,
  ListReviewEvidenceResponse,
  ListProviderConnectionsResponse,
  MarkConnectionItemsSeenData,
  MarkConnectionItemsSeenResponse,
  ReadProviderOAuthSetupData,
  ReadProviderOAuthSetupResponse,
  ResolveReviewEvidenceData,
  ResolveReviewEvidenceResponse,
  SendChatWithCliData,
  SendChatWithCliResponse,
  SendCompletionWithToolsData,
  SendCompletionWithToolsResponse,
  StartCliAuthLoginData,
  StartCliAuthLoginResponse,
  StartGitCredentialGithubSignInData,
  StartGitCredentialGithubSignInResponse,
  StartOverseerGithubSignInData,
  StartOverseerGithubSignInResponse,
  StartRecordingSiteSignInData,
  StartRecordingSiteSignInResponse,
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
  ListRecordingSitesData,
  ListRecordingSitesResponse,
  ListSignInSessionsData,
  ListSignInSessionsResponse,
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
  FAKE_DOCKER_DISK,
  FAKE_GIT_CREDENTIALS,
  FAKE_GROUP_NOTES,
  FAKE_GROUP_STORIES,
  FAKE_KNOWLEDGE_EVALUATION,
  FAKE_OVERSEER,
  FAKE_PROJECT_NOTES,
  FAKE_RECORDING_SITES,
  fakeCliSignIn,
  fakeGithubSignIn,
  fakeRecordingSignIn,
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
  appendFakeChatMessages,
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
import {
  fakeGroupMcpServers,
  fakeGroupMcpServerStatus,
  fakeProjectMcpServers,
  fakeProjectMcpServerStatus,
} from './fixtures/mcpServers'
import { API_CONFIG, CLI_MODELS, FAKE_LLM_CONFIGS } from './fixtures/models'
import {
  FAKE_PROCESS_RUN_STATISTICS,
  FAKE_PROCESS_RUNS,
  FAKE_PROCESSES,
  fakeProcessRunsMatching,
} from './fixtures/processRuns'
import {
  FAKE_FORKED_FROM_TEMPLATE_ID,
  FAKE_FORKED_TEMPLATE_PROVENANCE_COMMIT,
  FAKE_FORKED_TEMPLATE_UPSTREAM_COMMIT,
  FAKE_GROUP_ID,
  FAKE_GROUPS,
  FAKE_PROJECTS,
} from './fixtures/projects'
import { FAKE_GROUP_CONSTELLATION, FAKE_GROUP_STATUS } from './fixtures/projectsGroups'
import { FAKE_EVIDENCE_NOT_FOUND } from './fixtures/resolvedEvidenceConstants'
import { fakeReviewEvidenceList } from './fixtures/reviewEvidence'
import { FAKE_RUN_THROUGH_RUN_ID, fakeRunThroughEvidence } from './fixtures/runThroughRun'
import { fakeEvidenceTargetOf, fakeResolvedEvidence } from './fixtures/resolvedEvidence'
import { FAKE_AT } from './fixtures/stamps'
import { FAKE_STORIES_BY_PROJECT } from './fixtures/stories'
import { FAKE_TICKET_CONNECTION } from './fixtures/ticketConnections'
import { FakeRunThroughReview, type FakeRunThroughReviewAnswer } from './FakeRunThroughReview'
import { FakeTicketInbox } from './FakeTicketInbox'

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
const write = route('POST')

const publicRead = <TData extends ContractData, TResponse>(
  path: TData['url'],
  answer: (request: FakeRouteRequest) => TResponse,
): FakeRoute => ({ method: 'GET', path, isPublic: true, answer })

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
    refused: [],
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
const READS: readonly FakeRoute[] = [
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
  read<ListRecordingSitesData, ListRecordingSitesResponse>('/api/v1/recording-sites', () => ({
    sites: FAKE_RECORDING_SITES,
  })),
  write<StartRecordingSiteSignInData, StartRecordingSiteSignInResponse>(
    '/api/v1/recording-sites/{siteId}/sign-in',
    ({ params, missing }) => {
      const site = FAKE_RECORDING_SITES.find((held) => held.id === params.siteId)
      return site
        ? { site: { ...site, signingIn: true }, session: fakeRecordingSignIn(site) }
        : missing(`No fake recording site '${params.siteId}'.`)
    },
  ),
  write<StartCliAuthLoginData, StartCliAuthLoginResponse>('/api/v1/cli-auth/login', ({ body }) => ({
    session: fakeCliSignIn(body as StartCliAuthLoginData['body']),
  })),
  write<StartGitCredentialGithubSignInData, StartGitCredentialGithubSignInResponse>(
    '/api/v1/git-credentials/github/sign-in',
    () => ({ session: fakeGithubSignIn('git-credential') }),
  ),
  write<StartOverseerGithubSignInData, StartOverseerGithubSignInResponse>(
    '/api/v1/overseer/github/sign-in',
    () => ({ session: fakeGithubSignIn('bootstrap') }),
  ),
  read<ListSignInSessionsData, ListSignInSessionsResponse>('/api/v1/sign-in-sessions', () => ({
    sessions: [],
  })),
  {
    method: 'GET',
    path: '/api/v1/provider-connections/jira-cloud-id',
    answer: () => ({ cloudId: FAKE_JIRA_CLOUD_ID }),
  },
  read<ReadProviderOAuthSetupData, ReadProviderOAuthSetupResponse>(
    '/api/v1/provider-connections/oauth/setup',
    () => ({ github: false, jira: false, slack: false }),
  ),
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
  read<ListGroupMcpServersData, ListGroupMcpServersResponse>(
    '/api/v1/projects-groups/{id}/mcp-servers',
    ({ params, missing }) =>
      fakeGroupMcpServers(params.id) ?? missing(`No fake group '${params.id}'.`),
  ),
  read<ListGroupMcpServerStatusData, ListGroupMcpServerStatusResponse>(
    '/api/v1/projects-groups/{id}/mcp-servers/status',
    ({ params, missing }) =>
      fakeGroupMcpServerStatus(params.id) ?? missing(`No fake group '${params.id}'.`),
  ),
  read<ListProjectMcpServersData, ListProjectMcpServersResponse>(
    '/api/v1/projects/{id}/mcp-servers',
    ({ params }) => fakeProjectMcpServers(params.id),
  ),
  read<ListProjectMcpServerStatusData, ListProjectMcpServerStatusResponse>(
    '/api/v1/projects/{id}/mcp-servers/status',
    ({ params }) => fakeProjectMcpServerStatus(params.id),
  ),
  read<ListTemplatesData, ListTemplatesResponse>('/api/v1/templates', () => ({
    templates: [
      {
        id: 'investment-planner',
        name: 'Investment Planner',
        description:
          'A working investment planner you sculpt into your own — calculator, holdings tracker, and personalised top picks.',
        repoUrl: 'https://github.com/cloudjubei/thefactory-templates-financialplanner',
        difficulty: 'intermediate',
        estimatedTime: '1-2 hours',
      },
      {
        id: 'car-finder',
        name: 'Car Finder',
        description:
          'A working car-buying helper you sculpt into your own — a needs profile, a shortlist, fit-score comparison, and LLM-researched recommendations.',
        repoUrl: 'https://github.com/cloudjubei/thefactory-templates-carfinder',
        difficulty: 'intermediate',
        estimatedTime: '1-2 hours',
      },
      {
        id: 'plastic-free',
        name: 'Plastic-Free',
        description:
          'A working plastic-free replacement finder you sculpt into your own — state a goal, get products whose materials are verified with proof, stack your own criteria, and see every rejection explained.',
        repoUrl: 'https://github.com/cloudjubei/thefactory-templates-plasticfree',
        difficulty: 'intermediate',
        estimatedTime: '1-2 hours',
      },
    ],
  })),
  // Settled pixels for a forked project: provenance behind the catalog tip →
  // "Template updates available". Other projects are not from a template.
  read<CheckProjectTemplateUpdatesData, CheckProjectTemplateUpdatesResponse>(
    '/api/v1/projects/{projectId}/template-updates',
    ({ params, missing }) => {
      const project = FAKE_PROJECTS.find((row) => row.id === params.projectId)
      if (!project) return missing(`No fake project '${params.projectId}'.`)
      const provenance = project.metadata?.templateProvenance
      if (!provenance) return { available: false, status: 'not-from-template' }
      if (params.projectId === FAKE_FORKED_FROM_TEMPLATE_ID) {
        return {
          available: true,
          status: 'updates-available',
          provenance: {
            templateId: provenance.templateId,
            commit: FAKE_FORKED_TEMPLATE_PROVENANCE_COMMIT,
          },
          upstreamCommit: FAKE_FORKED_TEMPLATE_UPSTREAM_COMMIT,
        }
      }
      return {
        available: false,
        status: 'up-to-date',
        provenance: {
          templateId: provenance.templateId,
          commit: provenance.commit,
        },
        upstreamCommit: provenance.commit,
      }
    },
  ),
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
  read<GetDbDockerDiskData, GetDbDockerDiskResponse>(
    '/api/v1/db/docker/disk',
    () => FAKE_DOCKER_DISK,
  ),
  write<ClearDbDockerSpaceData, ClearDbDockerSpaceResponse>('/api/v1/db/docker/clear', () => ({
    freedBytes: FAKE_DOCKER_DISK.reclaimableBytes,
    disk: {
      ...FAKE_DOCKER_DISK,
      usedBytes: FAKE_DOCKER_DISK.usedBytes - FAKE_DOCKER_DISK.reclaimableBytes,
      reclaimableBytes: 0,
    },
  })),
  write<ResizeDbDockerDiskData, ResizeDbDockerDiskResponse>(
    '/api/v1/db/docker/resize',
    (request) => {
      const { sizeGb } = (request.body ?? {}) as Partial<ResizeDbDockerDiskData['body']>
      const range = FAKE_DOCKER_DISK.resize
      if (!range || !sizeGb || sizeGb <= range.currentGb || sizeGb > range.maxGb) {
        return request.invalid('A resize names a whole size above the current one.')
      }
      return {
        disk: {
          ...FAKE_DOCKER_DISK,
          allocatedBytes: sizeGb * 1_000_000_000,
          resize: { ...range, currentGb: sizeGb },
        },
      }
    },
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
  read<GetProjectDeviceAutomationData, GetProjectDeviceAutomationResponse>(
    '/api/v1/projects/{projectId}/device-automation',
    () => ({ enabled: false }),
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
  write<AddChatMessagesData, AddChatMessagesResponse>('/api/v1/chats/messages', (request) => {
    const body = request.body as AddChatMessagesData['body']
    if (!body?.context || !body.messages?.length) {
      return request.invalid('A chat message names its context and at least one message.')
    }
    return appendFakeChatMessages(body.context, body.messages)
  }),
  write<SendCompletionWithToolsData, SendCompletionWithToolsResponse>(
    '/api/v1/completions/send-with-tools',
    () => ({ resultType: 'success', results: [] }),
  ),
  write<SendChatWithCliData, SendChatWithCliResponse>(
    '/api/v1/completions/send-chat-with-cli',
    (request) => {
      const body = request.body as SendChatWithCliData['body']
      if (!body?.chatContext || !body.message) {
        return request.invalid('A CLI send names its chat and its message.')
      }
      appendFakeChatMessages(body.chatContext, [body.message])
      return {}
    },
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
        : params.runId === FAKE_RUN_THROUGH_RUN_ID
          ? fakeRunThroughEvidence()
          : { runId: params.runId ?? '', groups: [] },
  ),
  read<ListReviewEvidenceData, ListReviewEvidenceResponse>(
    '/api/v1/projects/{projectId}/review-evidence',
    ({ params, query, missing }) =>
      fakeReviewEvidenceList(params.projectId ?? '', query) ??
      missing(`No fake project '${params.projectId}'.`),
  ),
  read<ResolveReviewEvidenceData, ResolveReviewEvidenceResponse>(
    '/api/v1/review-evidence/resolve',
    ({ query, invalid, missing }) => {
      const reading = fakeEvidenceTargetOf(query)
      if (!reading.ok) return invalid(reading.error)
      const { projectId, evidenceId } = reading.target
      return (
        fakeResolvedEvidence(reading.target) ??
        missing(FAKE_EVIDENCE_NOT_FOUND(projectId, evidenceId))
      )
    },
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

/** The ticket connection, its tickets, and marking them seen: the one write, held by `inbox`. */
function ticketRoutes(inbox: FakeTicketInbox): FakeRoute[] {
  return [
    read<ListProviderConnectionsData, ListProviderConnectionsResponse>(
      '/api/v1/provider-connections',
      () => [FAKE_TICKET_CONNECTION],
    ),
    read<ListConnectionNewItemsData, ListConnectionNewItemsResponse>(
      '/api/v1/provider-connections/new-items',
      () => inbox.newItems(),
    ),
    read<ListConnectionAssignedItemsData, ListConnectionAssignedItemsResponse>(
      '/api/v1/provider-connections/{id}/assigned-items',
      ({ params, missing }) =>
        inbox.assigned(params.id ?? '') ?? missing(`No fake connection '${params.id}'.`),
    ),
    write<MarkConnectionItemsSeenData, MarkConnectionItemsSeenResponse>(
      '/api/v1/provider-connections/{id}/seen',
      ({ params, body, missing }) => {
        const { identityEpoch = '', items = [] } = (body ?? {}) as Partial<
          MarkConnectionItemsSeenData['body']
        >
        return (
          inbox.markSeen(params.id ?? '', identityEpoch, items) ??
          missing(`No fake connection '${params.id}' under identity '${identityEpoch}'.`)
        )
      },
    ),
  ]
}

/**
 * The run reads, the stories, and going over the run-through's issues: the
 * answers and the story finishing makes, held by `review`.
 */
function runThroughReviewRoutes(review: FakeRunThroughReview): FakeRoute[] {
  const storiesOf = (projectId: string | undefined) => [
    ...(FAKE_STORIES_BY_PROJECT[projectId ?? ''] ?? []),
    ...review.stories(projectId ?? ''),
  ]
  const answered = (
    result: FakeRunThroughReviewAnswer,
    { missing, invalid }: Pick<FakeRouteRequest, 'missing' | 'invalid'>,
  ): ProcessRun => {
    if (result.ok) return result.run
    return result.status === 404 ? missing(result.error) : invalid(result.error)
  }
  const isRunThrough = (runId: string | undefined, missing: FakeRouteRequest['missing']) => {
    if (runId !== FAKE_RUN_THROUGH_RUN_ID) missing(`No run-through issues in run '${runId}'.`)
  }
  return [
    read<ListStoriesData, ListStoriesResponse>(
      '/api/v1/projects/{projectId}/stories',
      ({ params }) => storiesOf(params.projectId),
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
    read<GetProcessRunData, GetProcessRunResponse>(
      '/api/v1/process-runs/{runId}',
      ({ params, missing }) =>
        (params.runId === FAKE_VARIANT_RUN_ID ? fakeVariantRun('done') : undefined) ??
        (params.runId === FAKE_RUN_THROUGH_RUN_ID ? review.run() : undefined) ??
        FAKE_PROCESS_RUNS.find((run) => run.id === params.runId) ??
        missing(`No fake run '${params.runId}'.`),
    ),
    write<AnswerRunThroughIssueData, AnswerRunThroughIssueResponse>(
      '/api/v1/process-runs/{runId}/issues/{issueId}/answer',
      (request) => {
        isRunThrough(request.params.runId, request.missing)
        return answered(
          review.answer(request.params.issueId ?? '', request.body),
          request,
        ) as AnswerRunThroughIssueResponse
      },
    ),
    write<FinishRunThroughIssueReviewData, FinishRunThroughIssueReviewResponse>(
      '/api/v1/process-runs/{runId}/issues/finish',
      (request) => {
        isRunThrough(request.params.runId, request.missing)
        return answered(review.finish(), request) as FinishRunThroughIssueReviewResponse
      },
    ),
  ]
}

/**
 * The route table one fake server answers from: every read, the tickets it
 * has shown, which start new for each table, and the run-through's issues,
 * which start unanswered for each table.
 */
export function fakeBackendRoutes(): readonly FakeRoute[] {
  return [
    ...READS,
    ...runThroughReviewRoutes(new FakeRunThroughReview()),
    ...ticketRoutes(new FakeTicketInbox()),
  ]
}
