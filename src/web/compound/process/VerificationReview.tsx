import { useState } from 'react'

import {
  useVerifyAttemptEvidence,
  verifyAttemptFacts,
  verifyAttemptStatus,
  verifySectionProps,
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
  /** The verify attempt itself: its outcome, the gate's reason, its timing and its proof. */
  entry: ProcessLedgerEntry
  /** The attempt's name, e.g. "Verify · attempt 3". */
  title: string
}

/**
 * One verify attempt as a small sign-off: what data it ran on, what the gate
 * concluded (or that a person accepted it over the gate), the reviewer's
 * verdict, and exactly the proof the gate judged — the pairs it counted, the
 * ones it did not and why, any new screen — behind the same capability tabs as
 * the story sign-off, which is the section this reuses.
 *
 * The screens are the gate's own record on the ledger entry; a before shared
 * from another attempt is found in the story's evidence by id. An entry from
 * before the gate recorded its proof falls back to what the reviewer filed in
 * the attempt's window. Read-only: the outcome is the pipeline's, and so are
 * the attempt's time and cost.
 */
export default function VerificationReview({
  projectId,
  review,
  entry,
  title,
}: VerificationReviewProps) {
  const attempt = useVerifyAttemptEvidence(projectId, entry, review)
  const [openPairKey, setOpenPairKey] = useState<string | undefined>()

  const status = verifyAttemptStatus(entry)

  // Only until the first load lands: a live re-pull (every run or chat event)
  // must not swap the whole section back to "loading" while nothing is filed yet.
  if (!attempt.loaded && !attempt.hasAny) {
    return <div className="p-4 text-[12px] text-(--text-secondary)">Loading the evidence…</div>
  }
  // A load that FAILED is not "the reviewer filed nothing" — say which it is.
  if (attempt.error && !attempt.hasAny) {
    return (
      <div className="flex flex-col items-start gap-2 p-4">
        <Alert variant="error">Couldn’t load this attempt’s evidence: {attempt.error}</Alert>
        <Button size="sm" variant="secondary" onClick={() => void attempt.reload()}>
          Try again
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5 p-3">
      <FeatureReviewSection
        projectId={projectId}
        kind="overall"
        badge={{ label: 'VERIFY', tone: status.tone }}
        title={title}
        facts={verifyAttemptFacts(entry)}
        agents={[]}
        rows={[]}
        verification={undefined}
        statusLine={status}
        {...verifySectionProps(entry, attempt.evidence)}
        onOpenPair={setOpenPairKey}
        onRequestImage={attempt.requestImage}
      />
      <ComparisonOverlay
        pairs={attempt.evidence.pairs}
        openKey={openPairKey}
        onClose={() => setOpenPairKey(undefined)}
        baseSha={undefined}
        headSha={undefined}
        onRequestImage={attempt.requestImage}
        projectId={projectId}
      />
    </div>
  )
}
