import type { ResolvedReviewEvidence } from '../../headless/api/generated/types.gen'
import { FAKE_PROJECT_ID } from './projects'
import {
  FAKE_EVIDENCE_IMAGE_URL,
  FAKE_EVIDENCE_MEDIA_EXPIRES_AT,
  FAKE_EVIDENCE_REFERENCE,
  FAKE_EVIDENCE_TARGET_AMBIGUOUS,
  FAKE_EVIDENCE_TARGET_BAD_MOMENT,
  FAKE_EVIDENCE_TARGET_NO_ID,
  FAKE_EVIDENCE_TARGET_NO_PROJECT,
  FAKE_EVIDENCE_TARGET_NOT_EVIDENCE,
  FAKE_EVIDENCE_VIDEO_URL,
} from './resolvedEvidenceConstants'
import { type FakeFiled, fakeFiledEvidence, fakeReviewEvidenceList } from './reviewEvidence'

/** The filed item a resolve names, and the moment in it. */
export interface FakeEvidenceTarget {
  projectId: string
  evidenceId: string
  at?: number
}

/** A resolve's query read as an item, or refused saying why. */
export type FakeEvidenceTargetReading =
  | { ok: true; target: FakeEvidenceTarget }
  | { ok: false; error: string }

const MEDIA = {
  image: { kind: 'image', mediaType: 'image/svg+xml', url: FAKE_EVIDENCE_IMAGE_URL },
  video: { kind: 'video', mediaType: 'video/webm', url: FAKE_EVIDENCE_VIDEO_URL },
} as const

const isMoment = (raw: string): boolean =>
  raw.trim() !== '' && Number.isFinite(Number(raw)) && Number(raw) >= 0

/**
 * The item a resolve's query names, as the real route reads it: by a
 * reference, whose own project and moment win, or by a project and an item id.
 */
export function fakeEvidenceTargetOf(query: URLSearchParams): FakeEvidenceTargetReading {
  const reference = query.get('reference')?.trim()
  const evidenceId = query.get('evidenceId')?.trim()
  const rawAt = query.get('at')
  if (rawAt !== null && !isMoment(rawAt)) {
    return { ok: false, error: FAKE_EVIDENCE_TARGET_BAD_MOMENT(rawAt) }
  }
  if (reference && evidenceId) return { ok: false, error: FAKE_EVIDENCE_TARGET_AMBIGUOUS }
  const parsed = reference ? FAKE_EVIDENCE_REFERENCE.exec(reference) : undefined
  if (reference && !parsed) {
    return { ok: false, error: FAKE_EVIDENCE_TARGET_NOT_EVIDENCE(reference) }
  }
  const projectId = parsed?.[1] ?? query.get('projectId')?.trim()
  const id = parsed?.[2] ?? evidenceId
  if (!id) return { ok: false, error: FAKE_EVIDENCE_TARGET_NO_ID }
  if (!projectId) return { ok: false, error: FAKE_EVIDENCE_TARGET_NO_PROJECT }
  const at = parsed?.[3] ?? rawAt ?? undefined
  return {
    ok: true,
    target: { projectId, evidenceId: id, ...(at !== undefined ? { at: Number(at) } : {}) },
  }
}

function titleOf({ issue, label, subject, phase, kind }: FakeFiled): string {
  if (issue) return issue.title
  if (label) return label
  if (subject) return phase ? `${subject}, ${phase}` : subject
  return kind
}

function mediaOf({ kind, mediaType }: FakeFiled): ResolvedReviewEvidence['media'] {
  const shown =
    kind === 'screenshot' && mediaType.startsWith('image/')
      ? MEDIA.image
      : kind === 'recording' && mediaType.startsWith('video/')
        ? MEDIA.video
        : undefined
  return shown ? { ...shown, expiresAt: FAKE_EVIDENCE_MEDIA_EXPIRES_AT } : undefined
}

const referenceOf = (projectId: string, evidenceId: string, at: number | undefined): string =>
  `&${projectId}/evidence/${evidenceId}${at !== undefined ? `@${Math.round(at * 10) / 10}` : ''}`

/** The recording an issue was met in: the first its run filed after it. */
function recordingOf({ runId, createdAt }: FakeFiled): FakeFiled | undefined {
  return fakeReviewEvidenceList(FAKE_PROJECT_ID, new URLSearchParams({ runId }))
    ?.filter((ref) => ref.kind === 'recording' && ref.createdAt >= createdAt)
    .sort((a, b) => a.createdAt - b.createdAt)[0]
}

function recordingAt(
  projectId: string,
  issue: FakeFiled,
  at: number | undefined,
): ResolvedReviewEvidence['recording'] {
  const recorded = recordingOf(issue)
  const media = recorded && mediaOf(recorded)
  if (!recorded || !media) return undefined
  return {
    evidenceId: recorded.id,
    reference: referenceOf(projectId, recorded.id, at),
    media,
  }
}

/**
 * What `GET /review-evidence/resolve` answers for an item the run fixtures
 * filed: its picture or recording served inline, its moment, an issue's
 * severity and the recording it was met in at that moment, and the run that
 * filed it. `undefined` for an item they never filed.
 */
export function fakeResolvedEvidence(
  target: FakeEvidenceTarget,
): ResolvedReviewEvidence | undefined {
  const { projectId, evidenceId } = target
  const filed = projectId === FAKE_PROJECT_ID ? fakeFiledEvidence(evidenceId) : undefined
  if (!filed) return undefined
  const { ref, group } = filed
  const at = target.at ?? ref.issue?.at
  const media = mediaOf(ref)
  const recording = ref.issue ? recordingAt(projectId, ref, at) : undefined
  return {
    projectId,
    evidenceId,
    reference: referenceOf(projectId, evidenceId, at),
    kind: ref.kind,
    title: titleOf(ref),
    ...(ref.issue ? { severity: ref.issue.severity } : {}),
    ...(media ? { media } : {}),
    ...(recording ? { recording } : {}),
    ...(at !== undefined ? { at } : {}),
    runId: ref.runId,
    ...(ref.runId === group.runId ? { owner: { processRunId: group.runId } } : {}),
    createdAt: ref.createdAt,
  }
}
