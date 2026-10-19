import { useEffect, useMemo } from 'react'
import { censusFeatures, incompleteStoryReason } from 'thefactory-tools/utils'

import { checkMethodRows, signoffVerdict } from '../utils/checkMethods'
import type { ChatChangesVerdictInput } from '../utils/chatChangesDockTypes'
import { useCliRunArtifact } from './useCliRunArtifact'
import { useReviewEvidence } from './useReviewEvidence'
import { useStories } from '../contexts/StoriesContext'

const NO_FEATURES: never[] = []

/**
 * What the checks of a run's changes say, read the way its review reads them —
 * the same rows and the same verdict — so the bar holding the decision never
 * disagrees with the review it opens. `undefined` until the run, its evidence
 * and its verification plan are read, and for a run that changed nothing.
 */
export function useRunSignoffVerdict(
  runId: string | undefined,
  projectId: string | undefined,
): ChatChangesVerdictInput | undefined {
  const {
    artifact,
    verification,
    verdict,
    diffReview,
    storyId,
    projectChecks,
    verificationApproaches,
    loadVerificationPlan,
    planLoading,
  } = useCliRunArtifact(runId, projectId)
  const changed = artifact !== undefined
  const evidence = useReviewEvidence(changed ? projectId : undefined, {
    runId,
    ...(storyId ? { storyId } : {}),
  })
  const { getStory } = useStories()

  useEffect(() => {
    if (changed && verificationApproaches.length === 0 && !planLoading) void loadVerificationPlan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changed, runId])

  const features = storyId ? (getStory(storyId)?.features ?? NO_FEATURES) : undefined
  return useMemo(() => {
    if (!changed || !evidence.loaded) return undefined
    const rows = checkMethodRows({
      verification,
      approaches: verificationApproaches,
      evidence: evidence.refs,
      ...(verdict?.by ? { verdictBy: verdict.by } : {}),
      ...(diffReview ? { diffReview } : {}),
      ...(projectChecks ? { projectChecks, now: Date.now() } : {}),
    })
    const storyIncomplete = features ? incompleteStoryReason(censusFeatures(features)) : undefined
    const headline = signoffVerdict({
      rows,
      verified: verification !== undefined,
      ...(storyIncomplete ? { storyIncomplete } : {}),
    })
    return {
      key: headline.key,
      failed: rows.filter((r) => r.state === 'failed' || r.state === 'unfinished').length,
    }
  }, [
    changed,
    evidence.loaded,
    evidence.refs,
    verification,
    verificationApproaches,
    verdict?.by,
    diffReview,
    projectChecks,
    features,
  ])
}
