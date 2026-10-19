import { useMemo } from 'react'
import { isApiChatTurnId } from 'thefactory-tools/utils'

import { checkMethodRows } from '../utils/checkMethods'
import type { CheckMethodRow } from '../utils/checkMethodTypes'
import { useCliRunArtifact } from './useCliRunArtifact'
import { useReviewEvidence } from './useReviewEvidence'

const NONE: CheckMethodRow[] = []

/**
 * The proof a run's turn already has — the methods that passed, read the way
 * its review reads them — for a line that shows it beside what the turn did.
 * Empty until read, and for an API chat turn, which keeps no run record.
 */
export function useRunPassedProof(
  runId: string | undefined,
  projectId: string | undefined,
): CheckMethodRow[] {
  const run = runId && !isApiChatTurnId(runId) ? runId : undefined
  const { verification, diffReview } = useCliRunArtifact(run, run ? projectId : undefined)
  const evidence = useReviewEvidence(run ? projectId : undefined, { runId: run })
  return useMemo(() => {
    if (!run || !evidence.loaded) return NONE
    return checkMethodRows({
      verification,
      approaches: [],
      evidence: evidence.refs,
      ...(diffReview ? { diffReview } : {}),
    }).filter((row) => row.state === 'passed')
  }, [run, evidence.loaded, evidence.refs, verification, diffReview])
}
