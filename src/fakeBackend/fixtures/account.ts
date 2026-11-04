import type {
  CliConfigsActiveState,
  GetDbHealthResponse,
  GetKnowledgeEvaluationSettingsResponse,
  GetProjectStorageUsageResponse,
  GetStorageUsageResponse,
  GroupNoteSummary,
  ListCliImageVersionsResponse,
  ListGroupStoriesResponse,
  OverseerState,
  ProjectNoteSummary,
  RedactedCliAuthCacheEntry,
  RedactedGitCredentialEntry,
  RedactedWebSearchKeyEntry,
  TestsResult,
} from '../../headless/api/generated/types.gen'
import { FAKE_GROUP_ID, FAKE_PROJECT_ID, FAKE_PROJECTS, MEMBERS } from './projects'
import { FAKE_STAMP } from './stamps'
import { STORY } from './stories'

export const FAKE_OVERSEER: OverseerState = {
  path: '/fake/overseer',
  hasRemote: false,
  projectCount: FAKE_PROJECTS.length,
  isEmpty: false,
  setupCompleted: true,
}

export const FAKE_GIT_CREDENTIALS: RedactedGitCredentialEntry[] = [
  {
    id: 'git-1',
    name: 'Fake GitHub',
    username: 'fake-user',
    email: 'fake@example.invalid',
    host: 'github.com',
    ...FAKE_STAMP,
    hasToken: true,
    hasRefreshToken: false,
  },
]

export const FAKE_WEB_SEARCH_KEYS: RedactedWebSearchKeyEntry[] = [
  { provider: 'exa', ...FAKE_STAMP, hasApiKey: true },
]

export const FAKE_CLI_AUTH_CACHES: RedactedCliAuthCacheEntry[] = [
  {
    id: 'cli-1',
    name: 'Fake Claude Code',
    cli: 'claude-code',
    ...FAKE_STAMP,
    fileNames: [],
  },
]

export const FAKE_CLI_STATE: CliConfigsActiveState = {
  activeCli: 'claude-code',
  activeCliCredentialId: 'cli-1',
  enabled: { 'claude-code': true, codex: false },
  defaultModel: { 'claude-code': 'claude-sonnet-5-5' },
}

export const FAKE_CLI_IMAGES: ListCliImageVersionsResponse = {
  docker: 'ok',
  images: [
    { cli: 'claude-code', image: 'fake/claude-code', installed: '1.0.0', state: 'up-to-date' },
    { cli: 'codex', image: 'fake/codex', state: 'not-built' },
  ],
}

export const FAKE_TESTS_RESULT: TestsResult = {
  status: 'fail',
  tests: [
    {
      filePath: 'src/chats/chatsUtils.test.ts',
      status: 'ok',
      summary: { total: 2, passed: 2, failed: 0, skipped: 0, durationMs: 40 },
      passes: [],
      failures: [],
      skips: [],
    },
  ],
  summary: { total: 3, passed: 2, failed: 1, skipped: 0, durationMs: 90 },
}

export const FAKE_TEST_PATHS = ['src/chats/chatsUtils.test.ts', 'src/git/gitUtils.test.ts']

const NOTE = { kind: 'note', access: 'open', author: 'user', ...FAKE_STAMP } as const

export const FAKE_PROJECT_NOTES: ProjectNoteSummary[] = [
  { ...NOTE, id: 'note-1', projectId: FAKE_PROJECT_ID, label: 'Release steps' },
  {
    ...NOTE,
    id: 'note-2',
    projectId: FAKE_PROJECT_ID,
    label: 'Staging login',
    kind: 'secret',
    access: 'ask',
    description: 'A secret note: its value stays behind a reveal.',
  },
]

export const FAKE_GROUP_NOTES: GroupNoteSummary[] = [
  { ...NOTE, id: 'gnote-1', label: 'Team conventions', groupId: FAKE_GROUP_ID },
]

export const FAKE_GROUP_STORIES: ListGroupStoriesResponse = [
  {
    id: 'group-story-1',
    groupId: FAKE_GROUP_ID,
    groupTitle: 'Overseer',
    title: STORY.title,
    description: STORY.description,
    parts: [{ projectId: FAKE_PROJECT_ID, storyId: STORY.id }],
    partViews: [
      {
        projectId: FAKE_PROJECT_ID,
        projectTitle: MEMBERS[0]?.title ?? FAKE_PROJECT_ID,
        storyId: STORY.id,
        storyTitle: STORY.title,
        status: 'in_progress',
        featuresDone: 1,
        featuresTotal: STORY.features.length,
        needs: [],
        step: 1,
      },
    ],
    steps: [[FAKE_PROJECT_ID]],
    problems: [],
    status: 'in_progress',
    ...FAKE_STAMP,
  },
]

const NO_STORAGE = {
  designBytes: 0,
  evidenceBytes: 0,
  uiTestBytes: 0,
  mobileTestBytes: 0,
  totalBytes: 0,
}

const STANDING = { totalBytes: 0, thresholdBytes: 10_000_000_000, over: false }

export const FAKE_STORAGE_USAGE: GetStorageUsageResponse = { ...STANDING, projects: [] }

export const fakeProjectStorageUsage = (projectId: string): GetProjectStorageUsageResponse => ({
  projectId,
  usage: NO_STORAGE,
  standing: STANDING,
})

export const FAKE_DB_HEALTH: GetDbHealthResponse = {
  configured: false,
  connected: false,
  initialized: false,
  phase: 'unconfigured',
  docker: { installed: true, running: true },
}

export const FAKE_KNOWLEDGE_EVALUATION: GetKnowledgeEvaluationSettingsResponse = {
  available: false,
  defaults: null,
  tabDefaults: { preset: 'default', promptMode: 'neutral', buildMode: 'heuristic', concurrency: 2 },
  choices: {
    stages: ['smoke'],
    presets: ['default'],
    capabilities: [],
    fixtures: [],
    promptModes: ['neutral'],
    buildModes: ['heuristic'],
    clis: ['claude-code'],
    concurrencyMax: 2,
  },
}
