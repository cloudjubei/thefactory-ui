import { useMemo } from 'react'
import type { ProcessLedgerEntry, ProcessRun } from 'thefactory-tools/types'

import { stepFilingOf } from '../utils/processStepRow'
import type { EvidenceTile, ReportAuthor } from '../utils/reviewEvidenceViewTypes'
import { useReviewEvidence } from './useReviewEvidence'

/**
 * The report one step attempt filed — its code review or its report — read from
 * its story's evidence. Absent until it loads, and for a run with no story.
 */
export function useStepFiling(
  run: Pick<ProcessRun, 'projectId' | 'storyId'>,
  entry: Pick<ProcessLedgerEntry, 'startedAt' | 'endedAt'> | undefined,
  authors: readonly ReportAuthor[],
): { tile: EvidenceTile | undefined; loaded: boolean } {
  const evidence = useReviewEvidence(run.storyId ? run.projectId : undefined, {
    storyId: run.storyId,
  })
  const key = authors.join(',')
  const tile = useMemo(
    () => stepFilingOf(evidence.tiles, entry, authors),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [evidence.tiles, entry?.startedAt, entry?.endedAt, key],
  )
  return { tile, loaded: evidence.loaded || !run.storyId }
}
