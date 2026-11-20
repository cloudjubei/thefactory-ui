import type { ResolvedReviewEvidence, ReviewEvidenceRef } from '../../src/headless/api/generated'
import { FAKE_PROJECT_ID } from '../../src/fakeBackend/fixtures/projects'
import type { FixtureRoutes } from './onFixtures'
import { shot } from './runThroughFixtures'

export const EVIDENCE_PROJECT = FAKE_PROJECT_ID
const RUN = 'tester-run'
const RECORDING_ID = '5be0d7aa-4c1e-4d0b-9a51-2f7c0e9d1b33'
const VIDEO = new URL('./assets/run-through-mixed.webm', import.meta.url).href
const FOREVER = '2999-01-01T00:00:00.000Z'

/** The cited items' ids — `gone` names one the backend no longer keeps. */
export const EVIDENCE_IDS = {
  shot: '73951ec4-1a2b-4c3d-8e4f-5a6b7c8d9e0f',
  issue: 'a41c9e02-6b7c-4d8e-9f0a-1b2c3d4e5f60',
  tip: 'c07e51b9-2c3d-4e5f-8a6b-7c8d9e0f1a2b',
  recording: RECORDING_ID,
  gone: '0f13aa77-3d4e-4f5a-9b6c-8d9e0f1a2b3c',
} as const

const image = (kind: Parameters<typeof shot>[0]) => ({
  kind: 'image' as const,
  mediaType: 'image/svg+xml',
  url: shot(kind),
  expiresAt: FOREVER,
})

const recording = {
  evidenceId: RECORDING_ID,
  reference: `&${EVIDENCE_PROJECT}/evidence/${RECORDING_ID}`,
  media: { kind: 'video' as const, mediaType: 'video/webm', url: VIDEO, expiresAt: FOREVER },
}

const item = (
  evidenceId: string,
  over: Partial<ResolvedReviewEvidence>,
): ResolvedReviewEvidence => ({
  projectId: EVIDENCE_PROJECT,
  evidenceId,
  reference: `&${EVIDENCE_PROJECT}/evidence/${evidenceId}`,
  kind: 'screenshot',
  title: 'Evidence',
  runId: RUN,
  createdAt: Date.UTC(2026, 10, 19, 9),
  owner: { processRunId: 'run-hot-seat', stepId: 'walkthrough', stepName: 'Walkthrough' },
  ...over,
})

/** What `GET /review-evidence/resolve` answers for each kept item. */
const ITEMS: Record<string, ResolvedReviewEvidence> = {
  [EVIDENCE_IDS.shot]: item(EVIDENCE_IDS.shot, { title: 'Result screen', media: image('result') }),
  [EVIDENCE_IDS.issue]: item(EVIDENCE_IDS.issue, {
    title: 'Result shows 0 to 0',
    severity: 'major',
    media: image('result'),
    at: 431,
    recording,
  }),
  [EVIDENCE_IDS.tip]: item(EVIDENCE_IDS.tip, {
    title: 'Tooltip covers End turn',
    severity: 'minor',
    media: image('tooltip'),
    at: 201,
    recording,
  }),
  [RECORDING_ID]: item(RECORDING_ID, {
    kind: 'recording',
    title: 'Run-through',
    media: recording.media,
  }),
}

const filed = (id: string, issue: NonNullable<ReviewEvidenceRef['issue']>): ReviewEvidenceRef =>
  ({
    id,
    runId: RUN,
    projectId: EVIDENCE_PROJECT,
    kind: 'screenshot',
    path: `${id}.svg`,
    mediaType: 'image/svg+xml',
    bytes: 1,
    createdAt: Date.UTC(2026, 10, 19, 9),
    issue,
  }) as ReviewEvidenceRef

/** The tester run's filings, which say what each issue's chip preview reads as what happened. */
const FILINGS: ReviewEvidenceRef[] = [
  filed(EVIDENCE_IDS.issue, {
    severity: 'major',
    title: 'Result shows 0 to 0',
    happened: 'Player 1 won on turn 9, but the result screen showed 0 points for both sides.',
    expected: 'The points each side scored.',
    view: '/game/result',
    at: 431,
  }),
  filed(EVIDENCE_IDS.tip, {
    severity: 'minor',
    title: 'Tooltip covers End turn',
    happened: 'Hovering a unit near the bottom right opened its tooltip over the End turn button.',
    view: '/game/hotseat',
    at: 201,
  }),
]

/** The reads a cited item makes, answered in the page; an item not listed is gone (404). */
export const EVIDENCE_ROUTES: FixtureRoutes = {
  '/api/v1/review-evidence/resolve': (_, query) => {
    const found = ITEMS[query.get('evidenceId') ?? '']
    if (!found) throw new Error('No longer kept')
    const at = query.get('at')
    return at === null ? found : { ...found, at: Number(at) }
  },
  '/api/v1/projects/{projectId}/review-evidence': () => FILINGS,
  'POST /api/v1/projects/{projectId}/review-evidence/{evidenceId}/media-url': () => ({
    url: VIDEO,
    expiresAt: FOREVER,
  }),
}

const cite = (id: string, at?: number) =>
  `&${EVIDENCE_PROJECT}/evidence/${id}${at === undefined ? '' : `@${at}`}`

/** What the agent wrote, as the chat and the report show it. */
export const EVIDENCE_TEXT = {
  ask: 'Play the hot-seat game end to end and tell me what you see.',
  chat: `I played a full hot-seat game, menu to result. ${cite(EVIDENCE_IDS.shot)} names the winner but shows no points, so I filed ${cite(EVIDENCE_IDS.issue)}. The turn also passes before a move finishes, at ${cite(RECORDING_ID, 90)}.`,
  report: `Two people can now play one game on the same screen. The menu starts a hot-seat match at ${cite(RECORDING_ID, 8)}, turns pass between the players at ${cite(RECORDING_ID, 90)} and the match ends on the ${cite(EVIDENCE_IDS.shot)}.\n\nTwo run-through issues stay open: ${cite(EVIDENCE_IDS.issue)} and ${cite(EVIDENCE_IDS.tip)}.`,
  missingAsk: 'Is the menu still showing “Hotseat”?',
  missing: `The first menu screenshot, ${cite(EVIDENCE_IDS.gone)}, was cleared with that run. The menu as it is now shows at ${cite(RECORDING_ID, 8)}.`,
} as const

/** The links the opened states and the evidence page show. */
export const EVIDENCE_LINKS = {
  shot: { kind: 'evidence', projectId: EVIDENCE_PROJECT, evidenceId: EVIDENCE_IDS.shot },
  issue: { kind: 'evidence', projectId: EVIDENCE_PROJECT, evidenceId: EVIDENCE_IDS.issue },
  moment: { kind: 'evidence', projectId: EVIDENCE_PROJECT, evidenceId: RECORDING_ID, at: 90 },
  gone: { kind: 'evidence', projectId: EVIDENCE_PROJECT, evidenceId: EVIDENCE_IDS.gone },
} as const
