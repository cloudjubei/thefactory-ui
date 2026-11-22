import type { ProcessRun } from 'thefactory-tools/types'
import {
  withRunThroughIssueAnswer,
  type RunThroughIssueAnswers,
  type RunThroughReportView,
} from 'thefactory-ui/headless'
import type { Story } from '../../src/headless/api/generated'
import { FAKE_PROJECTS } from '../../src/fakeBackend/fixtures/projects'
import { FAKE_STAMP } from '../../src/fakeBackend/fixtures/stamps'
import type { FixtureRoutes } from './onFixtures'
import { RUN_THROUGH_PROJECT, RUN_THROUGH_ROUTES, runThroughView } from './runThroughFixtures'

/** How far going over the issues has got, one fixed URL each. */
export type IssueReviewState = 'first' | 'some' | 'ready' | 'creating' | 'closed'

export const ISSUE_REVIEW_STATES: readonly IssueReviewState[] = [
  'first',
  'some',
  'ready',
  'creating',
  'closed',
]

const RUN_ID = 'hot-seat-run-through'
const STORY_ID = 'hot-seat-fixes'
const PROJECT_TITLE = 'Hot-seat game'
const RUN_TITLE = 'Hot-seat run-through'

/** The run-through's issues, worst first, as the sign-off reads them. */
export const ISSUE_REVIEW_REPORT: RunThroughReportView = runThroughView('mixed')

const [TURN, SCORE, TIP, TITLE] = ISSUE_REVIEW_REPORT.issues.map((row) => row.key) as [
  string,
  string,
  string,
  string,
]

/** The issue the "some answered" state shows: the one answered in the person's words. */
export const ISSUE_REVIEW_SOME_AT = 2

const REPLY = 'Open the tooltip above the unit, never over End turn.'

function answered(state: IssueReviewState): RunThroughIssueAnswers {
  if (state === 'first') return {}
  let answers = withRunThroughIssueAnswer({}, TURN, 'fix', undefined, 1)
  answers = withRunThroughIssueAnswer(answers, SCORE, 'not-an-issue', undefined, 2)
  answers = withRunThroughIssueAnswer(answers, TIP, 'fix', REPLY, 3)
  if (state === 'some') return answers
  return withRunThroughIssueAnswer(answers, TITLE, 'fix', undefined, 4)
}

const PARKED: ProcessRun = {
  id: RUN_ID,
  projectId: RUN_THROUGH_PROJECT,
  title: RUN_TITLE,
  status: 'parked',
  park: { reason: 'gate', stepId: 'sign-off', message: 'Sign off.', parkedAt: 0 },
  loopCounts: {},
  ledger: [],
  startedAt: 0,
  updatedAt: 0,
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
}

/** The run as the state finds it: at its sign-off with the answers so far, or closed with its story. */
export function issueReviewRun(state: IssueReviewState): ProcessRun {
  const issueAnswers = answered(state)
  if (state !== 'closed') return { ...PARKED, issueAnswers }
  const { park: _park, ...rest } = PARKED
  return {
    ...rest,
    status: 'succeeded',
    issueAnswers: answered('ready'),
    issueReview: {
      projectId: RUN_THROUGH_PROJECT,
      storyId: STORY_ID,
      fixes: 3,
      notIssues: 1,
      at: 5,
    },
  }
}

const feature = (id: string, title: string) => ({
  id,
  title,
  description: title,
  status: 'pending' as const,
  context: [],
  ...FAKE_STAMP,
})

/** The story closing the run made: one feature per fix. */
const FIX_STORY: Story = {
  id: STORY_ID,
  title: `Fix what “${RUN_TITLE}” met`,
  description: 'What the run-through met, gone over one by one: one feature per issue to fix.',
  status: 'pending',
  features: ISSUE_REVIEW_REPORT.issues
    .filter((row) => row.key !== SCORE)
    .map((row, index) => feature(`${STORY_ID}-f${index + 1}`, row.title)),
  ...FAKE_STAMP,
}

const RECORDING = ISSUE_REVIEW_REPORT.recording
const RECORDING_URL = new URL('./assets/run-through-mixed.webm', import.meta.url).href
const FOREVER = '2999-01-01T00:00:00.000Z'

/**
 * What the panel reads and writes, answered in the page: the run-through's
 * recording and its moments, the app's project, the story closing the run
 * made, and each answer kept. In the creating state closing the run never
 * comes back, so the button stays busy.
 */
export function issueReviewRoutes(state: IssueReviewState): FixtureRoutes {
  let run = issueReviewRun(state)
  return {
    ...RUN_THROUGH_ROUTES,
    '/api/v1/projects': () => [
      ...FAKE_PROJECTS,
      { ...FAKE_PROJECTS[0]!, id: RUN_THROUGH_PROJECT, title: PROJECT_TITLE },
    ],
    '/api/v1/projects/{projectId}/stories': ({ projectId }) =>
      projectId === RUN_THROUGH_PROJECT && state === 'closed' ? [FIX_STORY] : [],
    '/api/v1/projects/{projectId}/stories/order': ({ projectId }) =>
      projectId === RUN_THROUGH_PROJECT && state === 'closed' ? [STORY_ID] : [],
    '/api/v1/review-evidence/resolve': (_, query) => {
      const evidenceId = query.get('evidenceId') ?? ''
      const at = query.get('at')
      const row = ISSUE_REVIEW_REPORT.issues.find((r) => r.key === evidenceId)
      const isRecording = RECORDING?.ref.id === evidenceId
      if (!row && !isRecording) throw new Error('No longer kept')
      return {
        projectId: RUN_THROUGH_PROJECT,
        evidenceId,
        reference: `&${RUN_THROUGH_PROJECT}/evidence/${evidenceId}${at ? `@${at}` : ''}`,
        kind: isRecording ? 'recording' : 'screenshot',
        title: row?.title ?? 'Run-through recording',
        ...(row ? { severity: row.severity } : {}),
        media: isRecording
          ? { kind: 'video', mediaType: 'video/webm', url: RECORDING_URL, expiresAt: FOREVER }
          : {
              kind: 'image',
              mediaType: 'image/svg+xml',
              url: row?.screenshot?.dataUri ?? '',
              expiresAt: FOREVER,
            },
        ...(at !== null ? { at: Number(at) } : {}),
      }
    },
    'POST /api/v1/process-runs/{runId}/issues/{issueId}/answer': ({ issueId }, _query, body) => {
      const { answer, note } = body as { answer: 'fix' | 'not-an-issue'; note?: string }
      run = {
        ...run,
        issueAnswers: withRunThroughIssueAnswer(
          run.issueAnswers ?? {},
          issueId ?? '',
          answer,
          note,
          9,
        ),
      }
      return run
    },
    'POST /api/v1/process-runs/{runId}/issues/finish': () =>
      state === 'creating' ? new Promise(() => undefined) : issueReviewRun('closed'),
  }
}
