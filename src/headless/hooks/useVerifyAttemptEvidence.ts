import { useCallback, useMemo } from 'react'
import type { ProcessLedgerEntry, ProcessVerifyReview } from 'thefactory-tools/types'

import {
  evidenceLoadState,
  mergeEvidenceTiles,
  missingEvidenceIds,
  verifyAttemptEvidence,
} from '../utils/verifyProof'
import type { VerifyAttemptEvidence } from '../utils/verifyProofTypes'
import { useReviewEvidence } from './useReviewEvidence'

export type UseVerifyAttemptEvidence = {
  evidence: VerifyAttemptEvidence
  /** The reviewed run's filings have loaded at least once. */
  loaded: boolean
  error: string | undefined
  /** Anything at all is loaded — a failed re-pull over loaded evidence is not an empty attempt. */
  hasAny: boolean
  requestImage: (id: string, mediaType: string) => void
  reload: () => Promise<void>
}

/**
 * One verify attempt's evidence, whole.
 *
 * A reviewer files under the run it reviewed, but the before of a pair is often
 * shared from another attempt and filed under that attempt's run. When the
 * attempt's proof names a capture the reviewed run does not hold, the story's
 * evidence is loaded too and every capture is found by id — only then, so an
 * attempt whose proof is all its own costs one listing, as before. A capture is
 * called missing only once every listing it could be in has loaded.
 */
export function useVerifyAttemptEvidence(
  projectId: string | undefined,
  entry: ProcessLedgerEntry,
  review: ProcessVerifyReview,
): UseVerifyAttemptEvidence {
  const run = useReviewEvidence(projectId, { runId: review.reviewedRunId })
  const storyId = useMemo(() => run.refs.find((r) => r.storyId)?.storyId, [run.refs])
  const widen = useMemo(
    () => storyId !== undefined && missingEvidenceIds(entry.proof, run.refs).length > 0,
    [storyId, entry.proof, run.refs],
  )
  const story = useReviewEvidence(widen ? projectId : undefined, widen ? { storyId } : {})

  const tiles = useMemo(() => mergeEvidenceTiles(story.tiles, run.tiles), [story.tiles, run.tiles])
  const storyIds = useMemo(() => new Set(story.refs.map((r) => r.id)), [story.refs])
  const storyRequest = story.requestImage
  const runRequest = run.requestImage
  const requestImage = useCallback(
    (id: string, mediaType: string) =>
      (storyIds.has(id) ? storyRequest : runRequest)(id, mediaType),
    [storyIds, storyRequest, runRequest],
  )
  const runReload = run.reload
  const storyReload = story.reload
  const reload = useCallback(async () => {
    await Promise.all([runReload(), storyReload()])
  }, [runReload, storyReload])

  const error = run.error ?? story.error
  const state = evidenceLoadState({ loaded: run.loaded && story.loaded, error })
  const evidence = useMemo(
    () => verifyAttemptEvidence({ entry, review }, tiles, { evidence: state }),
    [entry, review, tiles, state],
  )

  return {
    evidence,
    loaded: run.loaded,
    error,
    hasAny: tiles.length > 0,
    requestImage,
    reload,
  }
}
