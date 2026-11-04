import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { configureBackendClient } from '../headless/api/bootstrap'
import { readStartupStatus } from '../headless/api/backendStartup'
import { WsClient, type WsConnectionState } from '../headless/api/WsClient'
import { client } from '../headless/api/generated/client.gen'
import * as sdk from '../headless/api/generated/sdk.gen'
import type { ChatContext } from '../headless/api/generated/types.gen'
import { isTestRun } from '../headless/api/helpers'
import { chatToolCatalogQueryOf } from '../headless/hooks/useChatToolCatalog'
import { buildChatToolToggles } from '../headless/utils/chatToolToggles'
import { gitBundleQuery } from '../headless/utils/gitBundle'
import { FakeBackendServer } from './FakeBackendServer'
import { FAKE_BACKEND_ROUTES } from './fakeBackendRoutes'

const TOKEN = 'fake-replay-token'
const PROJECT = 'thefactory-tools'
const GROUP = 'overseer'
const STORY = 's7'
const RUN = 'run-story'
const PROJECT_CHAT: ChatContext = { type: 'PROJECT', projectId: PROJECT }
const CHAT_ID = 'PROJECT/thefactory-tools'
const SOURCE = 'wargames:official-sources'
const on = { throwOnError: true } as const
const inProject = { path: { projectId: PROJECT }, ...on }
const inGroup = { path: { groupId: GROUP }, ...on }

type Call = readonly [string, () => Promise<{ data?: unknown }>]

/** Every provider of the two clients' shared tree, in mount order: what signing in fires. */
const START_UP: Call[] = [
  ['startup probe', () => client.get({ url: '/health/startup', ...on })],
  ['llm configs', () => sdk.listLlmConfigs(on)],
  ['agent runner', () => sdk.getActiveRunnerKind(on)],
  ['cli sign-ins', () => sdk.listCliAuthCaches(on)],
  ['active cli', () => sdk.getActiveCliState(on)],
  ['cli scorecards', () => sdk.listCliCapabilityScorecards(on)],
  ['cli images', () => sdk.listCliImageVersions(on)],
  ['git credentials', () => sdk.listGitCredentials(on)],
  ['web search keys', () => sdk.listWebSearchKeys(on)],
  ['provider connections', () => sdk.listProviderConnections(on)],
  ['overseer', () => sdk.getOverseer(on)],
  ['projects', () => sdk.listProjects(on)],
  ['groups', () => sdk.listProjectsGroups(on)],
  ['templates', () => sdk.listTemplates(on)],
  ['stories', () => sdk.listStories(inProject)],
  ['stories order', () => sdk.getStoriesOrder(inProject)],
  ['file list', () => sdk.getAllFileStats(inProject)],
  ['git bundle', () => sdk.getGitBundle({ ...inProject, query: gitBundleQuery(false, 300) })],
  ['chat list', () => sdk.listChatSummaries(on)],
  ['chat settings', () => sdk.getChatsSettings(on)],
  ['last test run', () => sdk.getLastTestsRun(inProject)],
  ['tools', () => sdk.listTools(on)],
  ['entities', () => sdk.listEntities({ query: { projectIds: PROJECT }, ...on })],
  ['live sources', () => sdk.listDataSources(on)],
  ['subscriptions', () => sdk.listProjectDataSubscriptions(inProject)],
  ['run list', () => sdk.listProcessRuns({ query: { rootOnly: true, projectId: PROJECT }, ...on })],
  ['asks by chat', () => sdk.countPendingCliAgentActionsByChat(on)],
  ['activities', () => sdk.listActivities(inProject)],
  ['sign-in cards', () => sdk.listCredentialCaptures(on)],
  ['feature requests', () => sdk.listFeatureRequests(on)],
  ['pricing', () => sdk.getPricing(on)],
]

/** What each main screen reads on top of start-up, by the tab that opens it. */
const SCREENS: Record<string, Call[]> = {
  welcome: [['auth providers', () => sdk.listOverseerAuthProviders(on)]],
  home: [
    ['story', () => sdk.getStory({ path: { projectId: PROJECT, storyId: STORY }, ...on })],
    ['group story chips', () => sdk.listProjectGroupStories(inProject)],
    [
      'story group chips',
      () => sdk.listStoryGroupStories({ path: { projectId: PROJECT, storyId: STORY }, ...on }),
    ],
    ['model setting', () => sdk.getUserSetting({ path: { key: 'projectOverviewModel' }, ...on })],
  ],
  files: [],
  design: [
    ['design', () => sdk.getProjectDesign(inProject)],
    ['playground', () => sdk.getDesignPlayground(inProject)],
    ['project storage', () => sdk.getProjectStorageUsage(inProject)],
  ],
  notes: [
    ['project notes', () => sdk.listProjectNotes(inProject)],
    ['group notes', () => sdk.listGroupNotes(inGroup)],
  ],
  knowledge: [['overview', () => sdk.getProjectKnowledgeOverview(inProject)]],
  chat: [
    ['open a chat', () => sdk.getChat({ body: { context: PROJECT_CHAT }, ...on })],
    ['chat summary', () => sdk.getChatSummary({ body: { context: PROJECT_CHAT }, ...on })],
    ['chat costs', () => sdk.getCostsByChat({ path: { chatKey: CHAT_ID }, ...on })],
    ['turn', () => sdk.getChatTurn({ query: { chatContextId: CHAT_ID }, ...on })],
    [
      'open changes',
      () =>
        sdk.getChatOpenChanges({ query: { projectId: PROJECT, chatContextId: CHAT_ID }, ...on }),
    ],
    ['asks', () => sdk.listPendingCliAgentActions({ query: { chatContextId: CHAT_ID }, ...on })],
    [
      'decided asks',
      () => sdk.listDecidedCliAgentActions({ query: { chatContextId: CHAT_ID }, ...on }),
    ],
    ['cli runs', () => sdk.listCliAgentRunSummaries({ query: { chatContextId: CHAT_ID }, ...on })],
    ['cli models', () => sdk.listCliAgentModels({ query: { cli: 'claude-code' }, ...on })],
    ['chat rules', () => sdk.listActionRules({ query: { chatContextId: CHAT_ID }, ...on })],
    [
      'tool rows',
      () => sdk.listChatToolCatalog({ query: { runner: 'api', type: 'PROJECT' }, ...on }),
    ],
  ],
  git: [
    ['git log', () => sdk.getGitBundle({ ...inProject, query: gitBundleQuery(true, 300) })],
    ['more log', () => sdk.getGitLog({ ...inProject, query: { all: true, maxCount: 300 } })],
    [
      'local diff',
      () => sdk.getGitLocalDiff({ ...inProject, body: { staged: false, includePatch: false } }),
    ],
  ],
  tests: [
    ['test paths', () => sdk.listTests(inProject)],
    ['last custom run', () => sdk.getLastTestsCustomRun(inProject)],
    ['coverage', () => sdk.getLastCoverage(inProject)],
    ['config candidates', () => sdk.listTestConfigCandidates(inProject)],
  ],
  'live-data': [['records', () => sdk.listSourceRecords({ path: { id: SOURCE }, ...on })]],
  processes: [
    ['processes', () => sdk.listProcesses({ query: { projectId: PROJECT }, ...on })],
    ['capabilities', () => sdk.getProcessCapabilities(on)],
    ['group runs', () => sdk.listProcessGroupRuns({ query: { groupId: GROUP }, ...on })],
    ['a run', () => sdk.getProcessRun({ path: { runId: RUN }, ...on })],
  ],
  settings: [
    ['saved rules', () => sdk.listActionRules(on)],
    [
      'daily usage',
      () => sdk.getDailyUsage({ query: { fromDay: '2026-10-01', toDay: '2026-10-25' }, ...on }),
    ],
    ['storage', () => sdk.getStorageUsage(on)],
    ['database', () => sdk.getDbHealth(on)],
    ['agent types', () => sdk.listProjectAgentTypes(inProject)],
    ['group agent types', () => sdk.listGroupAgentTypes(inGroup)],
    ['evaluation', () => sdk.getKnowledgeEvaluationSettings(inProject)],
    ['cross-project', () => sdk.getUserSetting({ path: { key: 'crossProject' }, ...on })],
    ['project data', () => sdk.listProjectData({ ...inProject, query: { type: 'settings' } })],
  ],
  group: [['group stories', () => sdk.listGroupStories(inGroup)]],
}

let server: FakeBackendServer
const onUnauthorized = vi.fn()
const onStarting = vi.fn()
let token: string | null = TOKEN

beforeAll(async () => {
  server = new FakeBackendServer({ token: TOKEN, routes: FAKE_BACKEND_ROUTES })
  await server.start()
  configureBackendClient({
    baseUrl: server.url,
    getToken: () => token,
    onUnauthorized,
    onAuthorized: () => undefined,
    onStarting,
  })
})

afterAll(async () => {
  await server.stop()
})

const replay = async (calls: readonly Call[]) => {
  const refused: string[] = []
  for (const [name, call] of calls) {
    await call().catch((err: unknown) => refused.push(`${name}: ${String(err)}`))
  }
  return refused
}

describe('signing in, as the login screens do', () => {
  it('passes the Test connection read at the url and token the person typed', async () => {
    const { data } = await sdk.health({
      throwOnError: true,
      baseURL: server.url,
      auth: () => TOKEN,
    })
    expect(data.version).toContain('fake')
  })

  it('holds no client at the loading screen', async () => {
    const { data } = await client.get({ url: '/health/startup', throwOnError: true })
    expect(readStartupStatus(data).ready).toBe(true)
  })

  it('reports nothing as still starting', async () => {
    await replay(START_UP)
    expect(onStarting).not.toHaveBeenCalled()
  })

  it('sends a client with a stale token back to its login screen', async () => {
    token = 'fake-stale'
    await expect(sdk.listProjects(on)).rejects.toBeDefined()
    token = TOKEN
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })
})

describe('reaching the main screens', () => {
  it('answers every read a client makes on start-up', async () => {
    expect(await replay(START_UP)).toEqual([])
  })

  it.each(Object.entries(SCREENS))('answers every read of %s', async (_, calls) => {
    expect(await replay(calls)).toEqual([])
  })

  it('gives the shell a project to open and a group to show it in', async () => {
    const { data: projects } = await sdk.listProjects(on)
    const { data: groups } = await sdk.listProjectsGroups(on)
    expect(projects?.[0]?.id).toBe(PROJECT)
    expect(groups?.[0]?.projects).toContain(PROJECT)
  })

  it('shows the opened project its stories in the stored order', async () => {
    const { data: stories } = await sdk.listStories(inProject)
    const { data: order } = await sdk.getStoriesOrder(inProject)
    expect(order).toEqual(stories?.map((story) => story.id))
    expect(stories?.length).toBeGreaterThan(0)
  })

  it('answers a test run in the shape the Tests screen reads', async () => {
    const { data } = await sdk.getLastTestsRun(inProject)
    expect(isTestRun(data as never)).toBe(true)
  })

  it('answers each git envelope as ok', async () => {
    const { data } = await sdk.getGitBundle({ ...inProject, query: gitBundleQuery(true, 300) })
    expect([data?.status.ok, data?.branches.ok, data?.stashes.ok]).toEqual([true, true, true])
  })
})

describe('chat settings', () => {
  const rowsFor = async (context: ChatContext, runner: 'api' | 'cli') => {
    const { data: catalog } = await sdk.listChatToolCatalog({
      query: chatToolCatalogQueryOf(context, runner),
      ...on,
    })
    const { data: settings } = await sdk.getChatsSettings(on)
    const completion = settings?.[context.type]?.completionSettings
    return buildChatToolToggles(catalog ?? [], completion, runner)
  }
  const shown = (rows: Awaited<ReturnType<typeof rowsFor>>) => rows.map((row) => row.name)

  it('shows a project chat and the app-level chat different tool rows', async () => {
    const project = await rowsFor(PROJECT_CHAT, 'api')
    const general = await rowsFor({ type: 'GENERAL' }, 'api')
    expect(shown(project)).toContain('startFeatureWork')
    expect(shown(general)).not.toContain('startFeatureWork')
    expect(shown(general)).toContain('createProject')
    expect(shown(project)).not.toContain('createProject')
  })

  it('shows a group chat rows of its own', async () => {
    const rows = await rowsFor({ type: 'GROUP', groupId: GROUP }, 'api')
    expect(shown(rows)).toContain('listGroupNotes')
    expect(shown(rows)).not.toContain('startFeatureWork')
  })

  it('keeps work launches out of a run chat', async () => {
    const rows = await rowsFor(
      { type: 'AGENT_RUN_STORY', projectId: PROJECT, agentRunId: RUN },
      'api',
    )
    expect(shown(rows)).not.toContain('startFeatureWork')
  })

  it('shows a chat on a CLI the transport’s rows', async () => {
    expect(shown(await rowsFor(PROJECT_CHAT, 'cli'))).toContain('spawnAgent')
  })

  it('locks a row the chat cannot switch off, and leaves another switchable', async () => {
    const rows = await rowsFor(PROJECT_CHAT, 'api')
    expect(rows.find((row) => row.name === 'askUser')?.toggleable).toBe(false)
    expect(rows.find((row) => row.name === 'startFeatureWork')).toMatchObject({
      toggleable: true,
      available: true,
    })
  })

  it('reads a tool the chat type leaves off as off', async () => {
    const rows = await rowsFor({ type: 'GENERAL' }, 'api')
    expect(rows.find((row) => row.name === 'readPaths')?.available).toBe(false)
  })

  it('opens a chat that was never stored with its type’s settings', async () => {
    const context: ChatContext = {
      type: 'FEATURE',
      projectId: PROJECT,
      storyId: STORY,
      featureId: 'f2',
    }
    const { data } = await sdk.getChat({ body: { context }, ...on })
    expect(data).toMatchObject({ context, messages: [] })
    expect(data?.settings?.completionSettings.availableTools).toContain('startFeatureWork')
  })

  it('opens a stored chat with its messages', async () => {
    const { data } = await sdk.getChat({ body: { context: PROJECT_CHAT }, ...on })
    expect(data?.messages?.length).toBeGreaterThan(0)
  })
})

describe('the app socket', () => {
  it('opens for the client the apps use, so none of them shows itself disconnected', async () => {
    const states: WsConnectionState[] = []
    const ws = new WsClient({
      baseUrl: server.url,
      getToken: () => TOKEN,
      onStateChange: (state) => states.push(state),
    })
    ws.connect()
    await vi.waitFor(() => expect(states).toContain('open'), { timeout: 5_000 })
    ws.disconnect()
  })
})

describe('an unknown route', () => {
  it('reaches the client as an error naming the route', async () => {
    await expect(
      client.get({ url: '/api/v1/not-a-route', throwOnError: true }),
    ).rejects.toMatchObject({
      response: {
        status: 404,
        data: { route: 'GET /api/v1/not-a-route', code: 'FAKE_BACKEND_UNKNOWN_ROUTE' },
      },
    })
  })
})
