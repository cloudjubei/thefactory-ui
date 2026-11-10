import type { LaunchProofPlan, ProcessProposal, ProofKind } from 'thefactory-tools/types'
import {
  START_GROUP_WORK_TOOL_NAME,
  type FakeDataInProduct,
  type GroupStoryRunPreview,
  type PendingToolGrant,
} from 'thefactory-ui/headless'
import { FAKE_PROCESS_RUN_STATISTICS } from '../../src/fakeBackend/fixtures/processRuns'
import { FAKE_GROUP_ID } from '../../src/fakeBackend/fixtures/projects'
import type { FixtureRoutes } from './onFixtures'

/** The story the launch works: the fake project's "Agent-to-agent chat messaging". */
export const FAKE_DATA_STORY_ID = 's7'

const SCREENS: ProcessProposal['steps'][number]['children'] = [
  { id: 'implement', name: 'Implement', kind: 'agent', agent: true, agentRole: 'developer' },
  { id: 'capture', name: 'Capture', kind: 'capture', agent: false },
  { id: 'verify', name: 'Verify', kind: 'agent', agent: true, agentRole: 'verifier' },
]

const nodeOf = (id: string, title: string): ProcessProposal['steps'][number] => ({
  id: `features:${id}`,
  name: title,
  kind: 'process',
  agent: false,
  subject: { kind: 'feature', id, title },
  maxIterations: 2,
  children: SCREENS,
})

const ON_SCREENS: ProofKind[] = ['checks', 'code-review', 'ui-before-after']
const NOT_ON_SCREENS: ProofKind[] = ['unit-tests', 'checks', 'code-review']

const SETUP_PLAN: LaunchProofPlan = {
  featureId: 'fake-data-setup',
  title: 'Fake data for the app',
  plan: { kinds: ON_SCREENS },
  source: 'feature',
  added:
    'Added first: the app has no fake data yet, and the screens of the work after it are proved on the fake data this builds.',
}

/** What the launch's preview is of. */
export type FakeDataLaunch =
  /** Proved on screens, on a project with no fake data yet: the setup feature is added first. */
  | 'setup-added'
  /** Proved on screens, on a project that already declares its fake data. */
  | 'declared'
  /** Not proved on screens: the preview offers no choice. */
  | 'no-screens'

/**
 * The preview of a launch of the fake project's story. Work proved on the app's screens carries
 * the project's fake-data choice — the backend's `fakeDataInProduct`; other work carries none.
 */
export function fakeDataLaunchProposal(
  launch: FakeDataLaunch,
  fakeDataInProduct: FakeDataInProduct = 'ship',
): ProcessProposal & { fakeDataInProduct?: FakeDataInProduct } {
  const screens = launch !== 'no-screens'
  const own = (featureId: string, title: string): LaunchProofPlan => ({
    featureId,
    title,
    plan: { kinds: screens ? ON_SCREENS : NOT_ON_SCREENS },
    source: 'feature',
  })
  return {
    processId: 'story',
    name: 'Story: feature by feature',
    steps: [
      ...(launch === 'setup-added' ? [nodeOf('fake-data-setup', 'Fake data for the app')] : []),
      nodeOf('f2', 'Reply in thread'),
      nodeOf('f3', 'Read receipts'),
      { id: 'sign-off', name: 'Sign-off', kind: 'gate', agent: false },
    ],
    proofPlans: [
      ...(launch === 'setup-added' ? [SETUP_PLAN] : []),
      own('f2', 'Reply in thread'),
      own('f3', 'Read receipts'),
    ],
    ...(screens ? { captureTarget: 'web' as const } : {}),
    defaultCaps: { spendUsdCap: 10, maxIterations: 2 },
    ...(screens ? { fakeDataInProduct } : {}),
  }
}

/** The reads the launch card makes, its preview the given launch's. */
export function fakeDataLaunchRoutes(
  launch: FakeDataLaunch,
  fakeDataInProduct?: FakeDataInProduct,
): FixtureRoutes {
  return {
    'POST /api/v1/processes/preview': () => fakeDataLaunchProposal(launch, fakeDataInProduct),
    '/api/v1/process-runs/statistics': () => FAKE_PROCESS_RUN_STATISTICS,
    '/api/v1/projects/{projectId}/notes': () => [],
    '/api/v1/projects/{projectId}/stories/order': () => [FAKE_DATA_STORY_ID],
  }
}

/** The group a group launch runs in: the fake backend's Overseer group. */
export const FAKE_DATA_GROUP_ID = FAKE_GROUP_ID

type GroupLeg = GroupStoryRunPreview['legs'][number]

const groupLeg = (
  projectId: string,
  projectTitle: string,
  dependsOn: string[],
  fakeDataInProduct?: FakeDataInProduct,
): GroupLeg => ({
  projectId,
  projectTitle,
  storyId: `read-receipts-${projectId}`,
  storyTitle: 'Read receipts',
  dependsOn,
  features: dependsOn.length === 0 ? 1 : 2,
  isPrerequisite: dependsOn.length === 0,
  defaultCaps: { spendUsdCap: 10, maxIterations: 2 },
  ...(fakeDataInProduct ? { fakeDataInProduct } : {}),
})

/** What a group launch's preview is of. */
export type FakeDataGroupLaunch =
  /** Two legs proved on app screens — one project ships it, one keeps it out — after one that is not. */
  | 'mixed'
  /** No leg proved on app screens: the card offers no choice. */
  | 'none-offered'

/**
 * The preview of a group launch across the fake group. A leg whose work is proved on its app's
 * screens carries that project's fake-data choice; the backend leg, proved without screens,
 * carries none.
 */
export function fakeDataGroupPreview(launch: FakeDataGroupLaunch): GroupStoryRunPreview {
  const screens = launch === 'mixed'
  return {
    groupId: FAKE_DATA_GROUP_ID,
    groupTitle: 'Overseer',
    legs: [
      groupLeg('thefactory-backend', 'TheFactory Backend', []),
      groupLeg(
        'thefactory-overseer-web',
        'Overseer Web',
        ['thefactory-backend'],
        screens ? 'ship' : undefined,
      ),
      groupLeg(
        'thefactory-overseer-mobile',
        'Overseer Mobile',
        ['thefactory-backend'],
        screens ? 'keep-out' : undefined,
      ),
    ],
    waves: [['thefactory-backend'], ['thefactory-overseer-web', 'thefactory-overseer-mobile']],
    problems: [],
  }
}

/** The `startGroupWork` ask's legs, as the agent sent them. */
const FAKE_DATA_GROUP_LEGS = fakeDataGroupPreview('mixed').legs.map(
  ({ projectId, storyId, dependsOn }) => ({ projectId, storyId, dependsOn }),
)

/** The read the group launch card makes, its preview the given launch's. */
export function fakeDataGroupLaunchRoutes(launch: FakeDataGroupLaunch): FixtureRoutes {
  return { 'POST /api/v1/process-group-runs/preview': () => fakeDataGroupPreview(launch) }
}

/** The agent's `startGroupWork` ask across the fake group; Start run hands the card's choices to `onLaunch`. */
export function fakeDataGroupGrant(
  onLaunch: (metadata: Record<string, unknown>) => void,
): PendingToolGrant {
  const args = { groupId: FAKE_DATA_GROUP_ID, title: 'Read receipts', legs: FAKE_DATA_GROUP_LEGS }
  return {
    id: 'launch:group:read-receipts',
    chatRunner: 'api',
    label: START_GROUP_WORK_TOOL_NAME,
    toolName: START_GROUP_WORK_TOOL_NAME,
    args,
    detail: { tool: START_GROUP_WORK_TOOL_NAME, args },
    decide: async (decision, metadata) => {
      if (decision === 'once') onLaunch(metadata ?? {})
    },
  }
}

/** What a group launch sent of the choices, as the scenes show it. */
export const fakeDataSentLine = (sent: { fakeDataInProduct?: unknown }): string =>
  `Sent fakeDataInProduct: ${JSON.stringify(sent.fakeDataInProduct ?? null)}`
