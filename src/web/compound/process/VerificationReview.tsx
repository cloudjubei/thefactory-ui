import { useMemo, useState } from 'react'

import {
  evidenceFiledWithin,
  groupEvidence,
  REVIEWER_VERDICT_LABEL,
  reviewerVerdict,
  runReviewFacts,
  screenPairs,
  useReviewEvidence,
  verifyReviewStatus,
  type ProcessLedgerEntry,
  type ProcessVerifyReview,
} from '../../../headless'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { ComparisonOverlay } from '../chat/signoff'
import FeatureReviewSection from './FeatureReviewSection'

export type VerificationReviewProps = {
  projectId: string
  /** Where this attempt's proof lives — the reviewed run, within the attempt's window. */
  review: ProcessVerifyReview
  /** The verify attempt itself: its outcome, the gate's reason and its timing. */
  entry: ProcessLedgerEntry
  /** The attempt's name, e.g. "Verify · attempt 3". */
  title: string
}

/**
 * One verify attempt as a small sign-off: the reviewer's verdict, and the proof
 * it rests on — the before/after screens, any new screen the change adds, the
 * walkthrough and the written report — behind the same capability tabs as the
 * story sign-off, which is the section this reuses.
 *
 * The proof is found where the verifier filed it (under the run it reviewed) and
 * narrowed to this attempt's window, so attempt 3 shows attempt 3's captures.
 * Read-only: the outcome is the pipeline's, decided by the gate.
 */
export default function VerificationReview({
  projectId,
  review,
  entry,
  title,
}: VerificationReviewProps) {
  const evidence = useReviewEvidence(projectId, { runId: review.reviewedRunId })
  const [openPairKey, setOpenPairKey] = useState<string | undefined>()

  const tiles = useMemo(
    () =>
      evidenceFiledWithin(evidence.tiles, {
        since: review.filedSince,
        ...(review.filedUntil !== undefined ? { until: review.filedUntil } : {}),
      }),
    [evidence.tiles, review.filedSince, review.filedUntil],
  )
  const pairs = useMemo(() => screenPairs(groupEvidence(tiles)), [tiles])
  const recordings = tiles.filter((t) => t.ref.kind === 'recording')
  const reports = tiles.filter((t) => t.ref.kind === 'report')
  const verdict = reviewerVerdict(tiles.map((t) => t.ref))
  const status = verifyReviewStatus(entry)
  const facts = runReviewFacts({
    costUSD: undefined,
    durationMs: entry.endedAt !== undefined ? entry.endedAt - entry.startedAt : undefined,
  })
  // The gate can conclude differently from the reviewer (an approval with
  // nothing to back it still fails), so its own reason shows when it adds one.
  const outcomeReason =
    entry.summary && entry.summary.trim() !== verdict?.reason ? entry.summary.trim() : undefined

  // Only until the first load lands: a live re-pull (every run or chat event)
  // must not swap the whole section back to "loading" while nothing is filed yet.
  if (!evidence.loaded && evidence.tiles.length === 0) {
    return <div className="p-4 text-[12px] text-(--text-secondary)">Loading the evidence…</div>
  }
  // A load that FAILED is not "the reviewer filed nothing" — say which it is.
  if (evidence.error && evidence.refs.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2 p-4">
        <Alert variant="error">Couldn’t load this attempt’s evidence: {evidence.error}</Alert>
        <Button size="sm" variant="secondary" onClick={() => void evidence.reload()}>
          Try again
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5 p-3">
      {outcomeReason ? (
        <p className="m-0 max-w-[72ch] text-[12px] text-(--text-secondary)">
          <span className="font-medium text-(--text-primary)">Step outcome:</span> {outcomeReason}
        </p>
      ) : null}
      <FeatureReviewSection
        projectId={projectId}
        kind="overall"
        badge={{ label: 'VERIFY', tone: status.tone }}
        title={title}
        facts={facts}
        agents={[]}
        rows={[]}
        verification={undefined}
        statusLine={status}
        pairs={pairs}
        recordings={recordings}
        reports={reports}
        {...(verdict
          ? {
              verdictNote: {
                label: REVIEWER_VERDICT_LABEL[verdict.verdict],
                ...(verdict.reason ? { reason: verdict.reason } : {}),
                tone: verdict.verdict === 'approved' ? ('done' as const) : ('stuck' as const),
              },
            }
          : {})}
        emptyLabel={
          entry.status === 'running'
            ? 'Nothing filed yet — the reviewer is still working.'
            : 'The reviewer filed no evidence for this attempt.'
        }
        onOpenPair={setOpenPairKey}
        onRequestImage={evidence.requestImage}
      />
      <ComparisonOverlay
        pairs={pairs}
        openKey={openPairKey}
        onClose={() => setOpenPairKey(undefined)}
        baseSha={undefined}
        headSha={undefined}
        onRequestImage={evidence.requestImage}
        projectId={projectId}
      />
    </div>
  )
}
