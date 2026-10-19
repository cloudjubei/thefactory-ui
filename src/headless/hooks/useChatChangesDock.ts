import { useMemo } from 'react'

import { chatChangesMarkerView, chatReviewHeader } from '../utils/chatChangesDock'
import { alreadyOnBaseView } from '../utils/runReview'
import type { ChatChangesMarkerView, ChatReviewHeaderView } from '../utils/chatChangesDockTypes'
import { useCliRunArtifact } from './useCliRunArtifact'

/**
 * Where a turn's marker sits: the run the chat's bar holds, whether a review
 * can open, and the commits the chat's approved commit asks made.
 */
export type ChatChangesMarkerPlace = {
  openRunId?: string
  canOpen: boolean
  receiptShas?: readonly string[]
}

/**
 * The one-line marker a chat turn leaves for the files it changed, read off
 * the run — `undefined` while it loads and for a turn that changed nothing.
 */
export function useChatChangesMarker(
  runId: string,
  projectId: string,
  place: ChatChangesMarkerPlace,
): ChatChangesMarkerView | undefined {
  const { artifact, landFailure, processRunId, verification, review, verdict, loading } =
    useCliRunArtifact(runId, projectId)
  const { openRunId, canOpen, receiptShas } = place
  return useMemo(() => {
    if (loading) return undefined
    const alreadyOnBase = alreadyOnBaseView(landFailure)
    return chatChangesMarkerView({
      runId,
      ...(artifact ? { artifact, changeFiles: artifact.payload.files } : {}),
      ...(alreadyOnBase ? { alreadyOnBase } : {}),
      ...(receiptShas ? { receiptShas } : {}),
      ...(landFailure ? { landFailed: true } : {}),
      ...(processRunId !== undefined ? { reportOnly: true } : {}),
      ...(verification !== undefined ? { hasReport: true } : {}),
      ...(review
        ? {
            review: {
              branch: review.branch,
              ...(review.shadow ? { shadow: true } : {}),
              ...(review.mergedAt != null ? { mergedAt: review.mergedAt } : {}),
              ...(review.rejectedAt != null ? { rejectedAt: review.rejectedAt } : {}),
            },
          }
        : {}),
      ...(verdict ? { decision: verdict.decision } : {}),
      ...(openRunId ? { openRunId } : {}),
      canOpen,
    })
  }, [
    loading,
    runId,
    artifact,
    landFailure,
    processRunId,
    verification,
    review,
    verdict,
    openRunId,
    canOpen,
    receiptShas,
  ])
}

/** The head of a run's opened review: "Changes · 10 files" and its branch. */
export function useChatReviewHeader(runId: string, projectId: string): ChatReviewHeaderView {
  const { artifact, landFailure, processRunId, review } = useCliRunArtifact(runId, projectId)
  return useMemo(
    () =>
      chatReviewHeader({
        ...(artifact ? { fileCount: artifact.payload.files.length } : {}),
        ...(landFailure ? { landFailed: true } : {}),
        ...(landFailure?.reason === 'already-on-base'
          ? {
              alreadyOnBase:
                landFailure.baseRef !== undefined ? { baseRef: landFailure.baseRef } : {},
            }
          : {}),
        ...(processRunId !== undefined ? { reportOnly: true } : {}),
        ...(review
          ? { review: { branch: review.branch, ...(review.shadow ? { shadow: true } : {}) } }
          : {}),
      }),
    [artifact, landFailure, processRunId, review],
  )
}
