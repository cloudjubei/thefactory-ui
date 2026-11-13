import type {
  LaunchProofPlan,
  ProcessLedgerEntry,
  ProcessProposal,
  ProcessRun,
} from 'thefactory-tools/types'
import type { GroupStoryRunPreview, LiveCheckDraft, LiveCheckOffer } from 'thefactory-ui/headless'
import type { NoteSummary } from '../../src/headless/utils/projectNotesTypes'
import { FAKE_PROCESS_RUN_STATISTICS } from '../../src/fakeBackend/fixtures/processRuns'
import { FAKE_GROUP_ID } from '../../src/fakeBackend/fixtures/projects'
import type { FixtureRoutes } from './onFixtures'

/** The story the launch works: the fake project's "Agent-to-agent chat messaging". */
export const LIVE_CHECK_STORY_ID = 's7'

const ADVICE_ASK_ME =
  'Recommended: ask me. The change shows on screen and you can watch it here: the device is set up and signed in for you, and you say whether it looks right. Only the after is checked; switch on before and after to see the problem on the base build first.'
const ADVICE_REQUIRED =
  'Recommended: required. This change was proved on fake data, and it depends on real services or media that fake data cannot show — an agent builds the everyday build, signs in with a test account and walks the change. Only the after is checked; switch on before and after to see the problem on the base build first.'
const ADVICE_OPTIONAL =
  'Optional: a live check on a test account shows the change on real data. Pick required for an agent to do it, or ask me to watch it yourself. Only the after is checked; switch on before and after to see the problem on the base build first.'
const ADVICE_OPEN_NOTE =
  ' The test logins are in “QA logins”, a note any agent can read: make it a secret that asks first.'

/** The offers the scenes show, by what the agent advises. */
export const LIVE_CHECK_OFFERS = {
  optional: { platform: 'web', accounts: ['qa'], advice: ADVICE_OPTIONAL },
  required: {
    platform: 'android',
    accounts: ['qa'],
    recommended: 'required',
    advice: ADVICE_REQUIRED,
  },
  'ask-me': { platform: 'web', accounts: ['qa'], recommended: 'ask-me', advice: ADVICE_ASK_ME },
  'open-note': {
    platform: 'web',
    accounts: ['qa'],
    recommended: 'ask-me',
    advice: `${ADVICE_ASK_ME}${ADVICE_OPEN_NOTE}`,
    openNote: true,
  },
  'ask-first-note': {
    platform: 'web',
    accounts: ['qa'],
    recommended: 'required',
    advice: ADVICE_REQUIRED,
    askFirstNote: true,
  },
} as const satisfies Record<string, LiveCheckOffer>

/** What a row starts at in each state the scenes show. */
export const LIVE_CHECK_ROW_STATES: Record<
  string,
  { offer: keyof typeof LIVE_CHECK_OFFERS; draft: LiveCheckDraft }
> = {
  off: { offer: 'optional', draft: { choice: 'off', beforeAndAfter: false } },
  required: { offer: 'required', draft: { choice: 'required', beforeAndAfter: false } },
  'ask-me': { offer: 'ask-me', draft: { choice: 'ask-me', beforeAndAfter: false } },
  'before-and-after': { offer: 'ask-me', draft: { choice: 'ask-me', beforeAndAfter: true } },
  'secret-hint': { offer: 'open-note', draft: { choice: 'ask-me', beforeAndAfter: false } },
  'ask-first-note': {
    offer: 'ask-first-note',
    draft: { choice: 'required', beforeAndAfter: false },
  },
}

/** The open note the secret hint opens: its label only is ever shown. */
export const LIVE_CHECK_OPEN_NOTE: NoteSummary = {
  id: 'note-qa-logins',
  label: 'QA logins',
  kind: 'note',
  access: 'open',
  author: 'user',
  purpose: 'test-accounts',
  description: 'Logins for the staging app',
  createdAt: '2026-11-01T09:00:00.000Z',
  updatedAt: '2026-11-01T09:00:00.000Z',
}

const CHAIN: ProcessProposal['steps'][number]['children'] = [
  { id: 'implement', name: 'Implement', kind: 'agent', agent: true, agentRole: 'developer' },
  { id: 'capture', name: 'Capture', kind: 'capture', agent: false },
  { id: 'verify', name: 'Verify', kind: 'agent', agent: true, agentRole: 'verifier' },
  { id: 'report', name: 'Report', kind: 'report', agent: true },
]

const nodeOf = (id: string, title: string): ProcessProposal['steps'][number] => ({
  id: `features:${id}`,
  name: title,
  kind: 'process',
  agent: false,
  subject: { kind: 'feature', id, title },
  maxIterations: 2,
  children: CHAIN,
})

const plan = (featureId: string, title: string, offer?: LiveCheckOffer): LaunchProofPlan => ({
  featureId,
  title,
  plan: { kinds: ['checks', 'code-review', 'ui-before-after'] },
  source: 'feature',
  ...(offer ? { liveCheckOffer: offer } : {}),
})

/** A launch preview: "Reply in thread" offered a live check as `offer` advises, "Read receipts" none. */
export function liveCheckLaunchProposal(offer?: keyof typeof LIVE_CHECK_OFFERS): ProcessProposal {
  return {
    processId: 'story',
    name: 'Story: feature by feature',
    steps: [
      nodeOf('f2', 'Reply in thread'),
      nodeOf('f3', 'Read receipts'),
      { id: 'sign-off', name: 'Sign-off', kind: 'gate', agent: false },
    ],
    proofPlans: [
      plan('f2', 'Reply in thread', offer ? LIVE_CHECK_OFFERS[offer] : undefined),
      plan('f3', 'Read receipts'),
    ],
    captureTarget: 'web',
    defaultCaps: { spendUsdCap: 10, maxIterations: 2 },
  }
}

/** The reads the launch card makes; the notes hold the open logins note. */
export function liveCheckLaunchRoutes(offer?: keyof typeof LIVE_CHECK_OFFERS): FixtureRoutes {
  return {
    'POST /api/v1/processes/preview': () => liveCheckLaunchProposal(offer),
    '/api/v1/process-runs/statistics': () => FAKE_PROCESS_RUN_STATISTICS,
    '/api/v1/projects/{projectId}/notes': () => [LIVE_CHECK_OPEN_NOTE],
    '/api/v1/projects/{projectId}/stories/order': () => [LIVE_CHECK_STORY_ID],
  }
}

/** The notes read for the secret hint's link. */
export const LIVE_CHECK_NOTE_ROUTES: FixtureRoutes = {
  '/api/v1/projects/{projectId}/notes': () => [LIVE_CHECK_OPEN_NOTE],
}

type GroupLeg = GroupStoryRunPreview['legs'][number]

/** A group launch across the fake group: Overseer Web offers two live checks, the backend none. */
export function liveCheckGroupPreview(): GroupStoryRunPreview {
  const leg = (projectId: string, projectTitle: string, dependsOn: string[]): GroupLeg => ({
    projectId,
    projectTitle,
    storyId: `read-receipts-${projectId}`,
    storyTitle: 'Read receipts',
    dependsOn,
    features: 2,
    isPrerequisite: dependsOn.length === 0,
    defaultCaps: { spendUsdCap: 10, maxIterations: 2 },
  })
  return {
    groupId: FAKE_GROUP_ID,
    groupTitle: 'Overseer',
    legs: [
      leg('thefactory-backend', 'TheFactory Backend', []),
      {
        ...leg('thefactory-overseer-web', 'Overseer Web', ['thefactory-backend']),
        liveCheckOffers: [
          { featureId: 'w1', title: 'Read ticks', offer: LIVE_CHECK_OFFERS['ask-me'] },
          { featureId: 'w2', title: 'Read receipts setting', offer: LIVE_CHECK_OFFERS.optional },
        ],
      } as GroupLeg,
    ],
    waves: [['thefactory-backend'], ['thefactory-overseer-web']],
    problems: [],
  }
}

const entry = (stepId: string, over: Partial<ProcessLedgerEntry> = {}): ProcessLedgerEntry => ({
  id: `${stepId}-1`,
  stepId,
  iteration: 1,
  status: 'done',
  outcome: 'passed',
  startedAt: 0,
  endedAt: 1,
  ...over,
})

/** The host's lines on a "Watch it live" stop, as the engine words them. */
export const LIVE_CHECK_WATCH_LINES = {
  ready:
    'Watch it live: The emulator Pixel_8 is open with the head build installed and signed in with a test account. Watch the change, then say whether it looks right.',
  problem:
    'Watch it live could not set the device up: no emulator here can reach the real services. Set it up again, or check it yourself and say whether it looks right.',
} as const

const BASE_STEPS: ProcessRun['plan']['steps'] = [
  { id: 'implement', name: 'Implement', kind: 'agent', agentType: 'developer' },
  { id: 'checks', name: 'Checks', kind: 'check' },
  { id: 'code-review', name: 'Code review', kind: 'judge' },
  { id: 'verify', name: 'Verify', kind: 'agent', agentType: 'verifier' },
]

function featureRun(
  steps: ProcessRun['plan']['steps'],
  loopId: string,
  ledger: ProcessLedgerEntry[],
  over: Partial<ProcessRun> = {},
): ProcessRun {
  return {
    id: '7c2d9f41-1b5e-4a8c-9d3f-6e0a2b4c8d17',
    projectId: 'thefactory-overseer-web',
    title: 'Reply in thread',
    featureId: 'f2',
    input: { runner: 'cli' },
    status: 'parked',
    loopCounts: {},
    startedAt: 0,
    updatedAt: 5,
    plan: {
      definitionId: 'feature-default',
      definitionScope: 'global',
      definitionVersion: 4,
      name: 'Feature',
      frozenAt: 0,
      steps: [...BASE_STEPS, ...steps, { id: 'report', name: 'Report', kind: 'report' }],
      loops: [
        { id: 'checks-fix', from: 'checks', to: 'implement', when: ['failed'], maxIterations: 3 },
        { id: 'verify-fix', from: 'verify', to: 'implement', when: ['failed'], maxIterations: 3 },
        { id: loopId, from: steps[0]!.id, to: 'implement', when: ['failed'], maxIterations: 3 },
      ],
    },
    ledger: [entry('implement'), entry('checks'), entry('code-review'), entry('verify'), ...ledger],
    ...over,
  }
}

const WATCH_STEP = {
  id: 'live-check-watch',
  name: 'Watch it live',
  kind: 'gate',
  gateKind: 'live-check',
  liveCheck: { mode: 'ask-me' },
} as const satisfies ProcessRun['plan']['steps'][number]

/** A feature run stopped at its "Watch it live", the host's line `line`. */
export function liveCheckWatchRun(
  line: keyof typeof LIVE_CHECK_WATCH_LINES,
  over: Partial<ProcessRun> = {},
): ProcessRun {
  return featureRun(
    [WATCH_STEP],
    'live-check-fix',
    [entry('live-check-watch', { status: 'running', outcome: undefined, endedAt: undefined })],
    {
      park: {
        reason: 'gate',
        stepId: 'live-check-watch',
        message: LIVE_CHECK_WATCH_LINES[line],
        parkedAt: 5,
      },
      ...over,
    },
  )
}

/** The same stop once nothing is left to send it back to the developer: the loop gives no pass. */
export const LIVE_CHECK_WATCH_SPENT_RUN: ProcessRun = (() => {
  const run = liveCheckWatchRun('ready')
  return {
    ...run,
    plan: { ...run.plan, loops: run.plan.loops.filter((l) => l.id !== 'live-check-fix') },
  }
})()

/** A finished run whose watch the person passed: "Looks right" on its row. */
export const LIVE_CHECK_WATCH_DECIDED_RUN = featureRun(
  [WATCH_STEP],
  'live-check-fix',
  [entry('live-check-watch', { override: { choice: 'approve', at: 5 } })],
  { status: 'succeeded' },
)

/** A run whose required live check filed `verdict`. */
export function liveCheckRequiredRun(verdict: 'approved' | 'changes-requested'): ProcessRun {
  const step = {
    id: 'live-check',
    name: 'Live check',
    kind: 'agent',
    agentType: 'verifier',
    liveCheck: { mode: 'required' },
  } as const satisfies ProcessRun['plan']['steps'][number]
  return featureRun(
    [step],
    'live-check-fix',
    [
      entry('live-check', {
        outcome: verdict === 'approved' ? 'passed' : 'failed',
        review: {
          verdict,
          ...(verdict === 'changes-requested'
            ? { reason: 'The reply opened in the main list, not under the message.' }
            : {}),
        },
      }),
    ],
    { status: verdict === 'approved' ? 'succeeded' : 'running' },
  )
}
