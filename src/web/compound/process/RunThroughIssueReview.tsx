import { useCallback } from 'react'

import {
  useProjects,
  useRunThroughIssueReview,
  type ProcessRun,
  type RunThroughIssueRow,
  type RunThroughReportView,
  type UseRunThroughIssueReview,
} from '../../../headless'
import { useToast } from '../../primitives/Toast'
import RunThroughIssueReviewEntry from './RunThroughIssueReviewEntry'
import RunThroughIssueReviewPanel from './RunThroughIssueReviewPanel'

const NO_ISSUES: readonly RunThroughIssueRow[] = []

/**
 * Going over a run's run-through issues, kept by the page: the review, the
 * app's project name for its words, and a refused answer said in a toast.
 */
export function useRunThroughIssueReviewOnPage(
  run: ProcessRun | undefined,
  report: RunThroughReportView | undefined,
): { review: UseRunThroughIssueReview; projectName: string } {
  const { toast } = useToast()
  const { projects } = useProjects()
  const onError = useCallback(
    (message: string) => toast({ variant: 'error', title: message }),
    [toast],
  )
  const review = useRunThroughIssueReview(run, report?.issues ?? NO_ISSUES, { onError })
  const projectId = run?.projectId ?? ''
  const projectName = projects.find((p) => p.id === projectId)?.title ?? projectId
  return { review, projectName }
}

export type RunThroughIssueReviewProps = {
  run: ProcessRun
  /** The run-through the run filed; absent, only how its issues were gone over shows. */
  report: RunThroughReportView | undefined
  /** Open the run's chat to talk an issue over. */
  onDiscuss?: () => void
}

/**
 * A run's run-through issues on its sign-off: "Go over the issues (N)" opening
 * the panel that goes over them one at a time, or how they were gone over.
 */
export default function RunThroughIssueReview({
  run,
  report,
  onDiscuss,
}: RunThroughIssueReviewProps) {
  const { review, projectName } = useRunThroughIssueReviewOnPage(run, report)
  return (
    <>
      <RunThroughIssueReviewEntry
        entry={review.entry}
        projectName={projectName}
        onStart={review.open}
      />
      {report ? (
        <RunThroughIssueReviewPanel
          review={review}
          projectId={run.projectId}
          projectName={projectName}
          {...(report.recording ? { recording: report.recording } : {})}
          {...(onDiscuss ? { onDiscuss } : {})}
        />
      ) : null}
    </>
  )
}
