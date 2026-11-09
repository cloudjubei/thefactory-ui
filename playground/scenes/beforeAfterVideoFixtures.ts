import type {
  ProcessProofVideoPair,
  ProcessVerifyProof,
  ProofKind,
  ReviewEvidenceRef,
} from 'thefactory-tools/types'
import { verifyProofView, type EvidenceTile } from 'thefactory-ui/headless'
import type { FixtureRoutes } from './onFixtures'

export const VIDEO_PROJECT = 'overseer-web'
const RUN = 'c5d1cd30'
const SUBJECT = 'Chats list — back to where it was scrolled'
const NEW_SUBJECT = 'Chat search — results as you type'
const BEFORE_VIDEO = new URL('./assets/proof-video-before.webm', import.meta.url).href
const AFTER_VIDEO = new URL('./assets/proof-video-after.webm', import.meta.url).href

/** The recordings the sign-off fetches, answered in the page from the bundled samples. */
const RECORDING_FILES: Record<string, string> = {
  'rec-before': BEFORE_VIDEO,
  'rec-after': AFTER_VIDEO,
  'rec-other-before': BEFORE_VIDEO,
  'rec-other-after': AFTER_VIDEO,
  'rec-new-after': AFTER_VIDEO,
}

export const RECORDING_ROUTES: FixtureRoutes = {
  '/api/v1/projects/{projectId}/review-evidence/{evidenceId}/content': async ({ evidenceId }) => {
    const file = RECORDING_FILES[evidenceId ?? '']
    if (!file) throw new Error(`No recording ${evidenceId}`)
    return (await fetch(file)).arrayBuffer()
  },
}

const recording = (
  id: string,
  phase: 'before' | 'after',
  subject: string,
  capturedOn: string,
): EvidenceTile => {
  const ref: ReviewEvidenceRef = {
    runId: RUN,
    projectId: VIDEO_PROJECT,
    id,
    kind: 'recording',
    path: `.factory/review-evidence/${RUN}/${id}.webm`,
    mediaType: 'video/webm',
    bytes: 9_400,
    createdAt: 0,
    phase,
    subject,
    capturedOn,
  }
  return { ref, caption: `${subject} — ${phase}` }
}

const TILES: EvidenceTile[] = [
  recording('rec-before', 'before', SUBJECT, 'Pixel 8 · factory-capture'),
  recording('rec-after', 'after', SUBJECT, 'Pixel 8 · factory-capture'),
  recording('rec-other-before', 'before', SUBJECT, 'Pixel 8 · factory-capture'),
  recording('rec-other-after', 'after', SUBJECT, 'Pixel Tablet · factory-capture'),
  recording('rec-new-after', 'after', NEW_SUBJECT, 'Pixel 8 · factory-capture'),
]

export const VIDEO_COUNTED: ProcessProofVideoPair = {
  subject: SUBJECT,
  beforeId: 'rec-before',
  afterId: 'rec-after',
  counted: true,
}

export const VIDEO_NOT_COUNTED: ProcessProofVideoPair = {
  subject: SUBJECT,
  beforeId: 'rec-other-before',
  afterId: 'rec-other-after',
  counted: false,
  reason:
    'Recorded on different devices (Pixel 8 · factory-capture vs Pixel Tablet · factory-capture), so the two recordings compare two devices, not two builds.',
}

export const VIDEO_NEW_SCREEN: ProcessProofVideoPair = {
  subject: NEW_SUBJECT,
  afterId: 'rec-new-after',
  newScreen: true,
  counted: true,
}

/** The video pairs as the sign-off reads them off a passed proof: the real view over fixed data. */
export const videoPairViews = (videoPairs: ProcessProofVideoPair[]) => {
  const proof: ProcessVerifyProof = {
    pairs: [],
    newScreenIds: [],
    recordingIds: videoPairs.flatMap((p) => (p.beforeId ? [p.beforeId, p.afterId] : [p.afterId])),
    videoPairs,
    outcome: 'passed',
    mode: 'dry',
  }
  return verifyProofView(proof, TILES, { standing: 'passed' }).videoPairs
}

/** What a request for changes requires of a fix that must show the change moving. */
export const VIDEO_REQUESTED: ProofKind[] = ['ui-before-after', 'ui-video']
