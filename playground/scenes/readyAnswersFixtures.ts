import type {
  ProcessLedgerEntry,
  ProcessPlan,
  ProcessPreExistingBreak,
  ProcessRun,
  ProcessVerifyProof,
} from 'thefactory-tools/types'
import { PROCESS_PRE_EXISTING_BREAK_TEXT } from 'thefactory-tools/constants'
import { processPreExistingBreakAsk } from 'thefactory-tools/utils'
import {
  PROCESS_TRY_BUILD_NOT_SHOWN_TITLE,
  type EvidenceTile,
  type ProcessTryBuildView,
} from 'thefactory-ui/headless'

const PLAN: ProcessPlan = {
  definitionId: 'feature-default',
  definitionScope: 'global',
  definitionVersion: 4,
  name: 'Feature',
  frozenAt: 0,
  steps: [
    { id: 'implement', name: 'Implement', kind: 'agent', agentType: 'developer' },
    { id: 'checks', name: 'Checks', kind: 'check' },
    { id: 'code-review', name: 'Code review', kind: 'judge' },
    { id: 'verify', name: 'Verify', kind: 'agent', agentType: 'verifier' },
    { id: 'report', name: 'Report', kind: 'report' },
  ],
  loops: [
    { id: 'checks-fix', from: 'checks', to: 'implement', when: ['failed'], maxIterations: 3 },
    { id: 'verify-fix', from: 'verify', to: 'implement', when: ['failed'], maxIterations: 3 },
  ],
}

const done = (id: string, stepId: string, startedAt: number): ProcessLedgerEntry => ({
  id,
  stepId,
  iteration: 1,
  status: 'done',
  outcome: 'passed',
  startedAt,
})

const SVG = (color: string, label: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="184" height="328"><rect width="184" height="328" fill="${color}"/><text x="92" y="168" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#fff">${label}</text></svg>`,
  )}`

const tile = (id: string, subject: string, phase: 'before' | 'after', color: string) =>
  ({
    ref: { id, subject, phase, kind: 'screenshot', createdAt: 0 },
    dataUri: SVG(color, phase),
  }) as unknown as EvidenceTile

/** The captures the partial proof's two counted pairs rest on. */
export const PARTIAL_PROOF_TILES: EvidenceTile[] = [
  tile('b-grow', 'Bio grows on first edit', 'before', '#64748b'),
  tile('a-grow', 'Bio grows on first edit', 'after', '#0f766e'),
  tile('b-count', 'Character count', 'before', '#64748b'),
  tile('a-count', 'Character count', 'after', '#0f766e'),
]

/** A verifier that showed two points and named two it could not show: unchecked, never failed. */
export const PARTIAL_PROOF: ProcessVerifyProof = {
  pairs: [
    {
      subject: 'Bio grows on first edit',
      beforeId: 'b-grow',
      afterId: 'a-grow',
      changedPixels: 31_200,
      totalPixels: 60_352,
      counted: true,
    },
    {
      subject: 'Character count',
      beforeId: 'b-count',
      afterId: 'a-count',
      changedPixels: 4_100,
      totalPixels: 60_352,
      counted: true,
    },
  ],
  newScreenIds: [],
  recordingIds: [],
  outcome: 'unchecked',
  mode: 'dry',
  dryAssumptions: 'A profile with a 40-character bio.',
  notShown: ['Long paste wraps inside the box', 'Text selection handles stay on screen'],
}

const verifyEntry = (over: Partial<ProcessLedgerEntry> = {}): ProcessLedgerEntry => ({
  id: 'verify-1',
  stepId: 'verify',
  iteration: 1,
  status: 'done',
  outcome: 'unchecked',
  startedAt: 3,
  summary:
    'Shown: Bio grows on first edit, Character count. Not shown: Long paste wraps inside the box, Text selection handles stay on screen.',
  proof: PARTIAL_PROOF,
  runRef: { runId: 'run-verify', agentRunId: 'agent-verify', runner: 'cli' },
  ...over,
})

function feature(over: Partial<ProcessRun>): ProcessRun {
  return {
    id: '3c9e1f04-7a2b-4d6e-9f18-5b0c2a7e4d91',
    projectId: 'covision-ios',
    title: 'Long profile text',
    featureId: 'b7d2e5a1-0c4f-4e93-8a6b-2f1d9c3e7a50',
    input: { runner: 'cli' },
    status: 'parked',
    loopCounts: {},
    startedAt: 0,
    updatedAt: 4,
    plan: PLAN,
    ledger: [],
    ...over,
  }
}

/** Verify showed part of the change: carrying on leads, verifying just the rest again beside it. */
export const PARTIAL_PROOF_RUN: ProcessRun = feature({
  ledger: [
    done('implement-1', 'implement', 0),
    done('checks-1', 'checks', 1),
    done('review-1', 'code-review', 2),
    verifyEntry(),
  ],
  park: {
    reason: 'step-unchecked',
    stepId: 'verify',
    message: 'Verify proved part of the change.',
    parkedAt: 4,
  },
})

/** Unit tests already fail on main, in a test file the change does not touch. */
export const CHECKS_BREAK: ProcessPreExistingBreak = {
  source: 'checks',
  checks: ['Unit tests'],
  files: ['CovisionTests/AssetTypeTests.swift'],
  baseRef: 'main',
  baseSha: 'c41d9e2a7b5f30186d4e',
  headline:
    "CovisionTests/AssetTypeTests.swift:48:19: error: value of type 'AssetType' has no member 'iconName'",
}

/** The checks stop on that break: repair it in its own commit, leave it out, or stop. */
export const CHECKS_BREAK_RUN: ProcessRun = feature({
  ledger: [
    done('implement-1', 'implement', 0),
    {
      id: 'checks-1',
      stepId: 'checks',
      iteration: 1,
      status: 'done',
      outcome: 'unchecked',
      startedAt: 1,
      summary: PROCESS_PRE_EXISTING_BREAK_TEXT.checksSummary(CHECKS_BREAK),
      preExistingBreak: CHECKS_BREAK,
    },
  ],
  park: {
    reason: 'step-unchecked',
    stepId: 'checks',
    message: PROCESS_PRE_EXISTING_BREAK_TEXT.checksSummary(CHECKS_BREAK),
    parkedAt: 2,
  },
})

/** The same break, found by the developer running the tests itself and confirmed at the base. */
export const DEVELOPER_BREAK: ProcessPreExistingBreak = {
  ...CHECKS_BREAK,
  source: 'developer',
  files: ['CovisionTests/AssetTypeTests.swift', 'CovisionTests/RoomListTests.swift'],
}

/** The developer waiting on the person about it: repair, leave out, or stop. */
export const DEVELOPER_BREAK_RUN: ProcessRun = feature({
  ledger: [
    {
      id: 'implement-1',
      stepId: 'implement',
      iteration: 1,
      status: 'done',
      outcome: 'waiting',
      startedAt: 0,
      runRef: { runId: 'run-dev', agentRunId: 'agent-dev', runner: 'cli' },
    },
  ],
  park: {
    reason: 'step-waiting',
    stepId: 'implement',
    message: 'The developer is blocked',
    parkedAt: 1,
    ask: processPreExistingBreakAsk(DEVELOPER_BREAK, 'developer'),
  },
})

/** A run at its sign-off whose verify was carried on past two points, with one target left out. */
export const CARRIED_SIGNOFF_RUN: ProcessRun = feature({
  status: 'parked',
  ledger: [
    done('implement-1', 'implement', 0),
    {
      id: 'checks-1',
      stepId: 'checks',
      iteration: 1,
      status: 'done',
      outcome: 'unchecked',
      startedAt: 1,
      preExistingBreak: CHECKS_BREAK,
      override: { choice: 'continue', at: 2 },
    },
    done('review-1', 'code-review', 2),
    verifyEntry({ override: { choice: 'continue', at: 4 } }),
  ],
})

/** The same sign-off with nothing left out: points to try alone. */
export const POINTS_ONLY_SIGNOFF_RUN: ProcessRun = {
  ...CARRIED_SIGNOFF_RUN,
  ledger: CARRIED_SIGNOFF_RUN.ledger.filter((e) => e.stepId !== 'checks'),
}

/** The phone build beside it, ready to install. */
export const CARRIED_TRY_BUILD: ProcessTryBuildView = {
  runId: CARRIED_SIGNOFF_RUN.id,
  offered: true,
  status: 'ready',
  variant: 'CovisionDebug',
  builtFrom: 'e8a41c7',
  fileName: 'CovisionDebug-e8a41c7.ipa',
  bytes: 38_211_584,
  downloadUrl: '/api/v1/process-runs/r-try/try-build/app.ipa?viewToken=fake-signed-token',
  steps: [
    {
      title: 'Profile bio',
      open: 'Profile → Edit',
      steps: ['Type a few words into the bio', 'Watch the box grow'],
    },
    {
      title: PROCESS_TRY_BUILD_NOT_SHOWN_TITLE,
      steps: ['Long paste wraps inside the box', 'Text selection handles stay on screen'],
    },
  ],
}
