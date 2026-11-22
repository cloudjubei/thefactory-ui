import type { ProcessRun } from 'thefactory-tools/types'

import type {
  GetProcessRunEvidenceResponse,
  ReviewEvidenceRef,
} from '../../headless/api/generated/types.gen'
import { FAKE_EVIDENCE_IDS, type FakeEvidenceName } from './evidenceIdsConstants'
import { FAKE_PROJECT_ID } from './projects'

export const FAKE_RUN_THROUGH_RUN_ID = 'run-through-sign-up'

const TITLE = 'Run through sign-up as a new user'

/** A tester's run through sign-up, parked at its sign-off with what it met, as `GET /process-runs/:runId` answers it. */
export const FAKE_RUN_THROUGH_RUN = {
  id: FAKE_RUN_THROUGH_RUN_ID,
  projectId: FAKE_PROJECT_ID,
  title: TITLE,
  status: 'parked',
  park: { reason: 'gate', stepId: 'sign-off', message: 'Sign off.', parkedAt: 22 },
  loopCounts: {},
  ledger: [
    {
      id: 'run-through-1',
      stepId: 'run-through',
      iteration: 1,
      status: 'done',
      outcome: 'passed',
      startedAt: 1,
      endedAt: 22,
    },
  ],
  startedAt: 0,
  updatedAt: 22,
  plan: {
    definitionId: 'run-through',
    definitionScope: 'global',
    definitionVersion: 1,
    name: 'Run-through',
    steps: [
      { id: 'run-through', name: 'Run through', kind: 'agent', agentType: 'tester' },
      { id: 'sign-off', name: 'Sign-off', kind: 'gate' },
    ],
    loops: [],
    frozenAt: 0,
  },
} satisfies ProcessRun

const filed = (name: FakeEvidenceName, over: Partial<ReviewEvidenceRef>): ReviewEvidenceRef => ({
  id: FAKE_EVIDENCE_IDS[name],
  runId: FAKE_RUN_THROUGH_RUN_ID,
  projectId: FAKE_PROJECT_ID,
  kind: 'screenshot',
  path: `${name}.png`,
  mediaType: 'image/png',
  bytes: 1,
  approach: 'run-through',
  createdAt: 10,
  ...over,
})

const issue = (
  name: FakeEvidenceName,
  createdAt: number,
  flagged: NonNullable<ReviewEvidenceRef['issue']>,
): ReviewEvidenceRef =>
  filed(name, {
    label: flagged.title,
    createdAt,
    issue: { ...flagged, screenshotFile: `${name}.png` },
  })

/** What the tester flagged, worst first, each on the screenshot that shows it. */
export const FAKE_RUN_THROUGH_ISSUES: readonly ReviewEvidenceRef[] = [
  issue('run-through-blocker', 12, {
    severity: 'blocker',
    title: 'Create account does nothing',
    happened: 'Tapping Create account left the form as it was, with no message.',
    expected: 'The welcome screen, or a message saying what is wrong.',
    doing: 'Finishing sign-up',
    view: 'Sign-up form',
    at: 42,
  }),
  issue('run-through-major', 14, {
    severity: 'major',
    title: 'Password rules show only after a failed try',
    happened: 'The rules appeared once the password had been refused.',
    expected: 'The rules beside the field from the start.',
    view: 'Sign-up form',
  }),
  issue('run-through-minor', 16, {
    severity: 'minor',
    title: 'Welcome text cut off on a narrow screen',
    happened: 'The last word of the greeting ran past the edge.',
    view: 'Welcome screen',
  }),
]

/** The session's recording, filed as it closed: after every issue it was met in. */
const RECORDING = filed('run-through-recording', {
  kind: 'recording',
  label: 'Recording of the run-through',
  path: 'run-through.webm',
  mediaType: 'video/webm',
  createdAt: 20,
})

const RECORD = filed('run-through-record', {
  kind: 'report',
  label: 'Run-through',
  path: 'run-through.md',
  mediaType: 'text/markdown',
  createdAt: 21,
  runThroughSections: {
    scenario: 'Sign up as a new user and reach the welcome screen.',
    reachedEnd: true,
    summary: 'Reached the end after a retry; three issues flagged on the way.',
  },
})

/** What `GET /process-runs/:runId/evidence` answers for the run-through. */
export function fakeRunThroughEvidence(): GetProcessRunEvidenceResponse {
  return {
    runId: FAKE_RUN_THROUGH_RUN_ID,
    groups: [
      {
        runId: FAKE_RUN_THROUGH_RUN_ID,
        label: TITLE,
        status: 'parked',
        evidence: [...FAKE_RUN_THROUGH_ISSUES, RECORDING, RECORD],
      },
    ],
  }
}
