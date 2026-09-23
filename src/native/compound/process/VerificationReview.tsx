import { useMemo, useState } from 'react'
import { Text, View } from 'react-native'

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
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { ComparisonOverlay, type SaveFileHandler } from '../chat/signoff'
import FeatureReviewSection from './FeatureReviewSection'

export type VerificationReviewProps = {
  projectId: string
  /** Where this attempt's proof lives — the reviewed run, within the attempt's window. */
  review: ProcessVerifyReview
  /** The verify attempt itself: its outcome, the gate's reason and its timing. */
  entry: ProcessLedgerEntry
  /** The attempt's name, e.g. "Verify · attempt 3". */
  title: string
  /** Native host's file saver; enables downloads when provided. */
  onSaveFile?: SaveFileHandler
}

/**
 * Native peer of
 * [web's `VerificationReview`](../../../web/compound/process/VerificationReview.tsx).
 * One verify attempt as a small sign-off: the reviewer's verdict and the proof it
 * rests on, behind the story sign-off's own capability tabs.
 */
export default function VerificationReview({
  projectId,
  review,
  entry,
  title,
  onSaveFile,
}: VerificationReviewProps) {
  const { theme } = useNativeTheme()
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
  const outcomeReason =
    entry.summary && entry.summary.trim() !== verdict?.reason ? entry.summary.trim() : undefined

  // Only until the first load lands: a live re-pull (every run or chat event)
  // must not swap the whole section back to "loading" while nothing is filed yet.
  if (!evidence.loaded && evidence.tiles.length === 0) {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>Loading the evidence…</Text>
      </View>
    )
  }
  // A load that FAILED is not "the reviewer filed nothing" — say which it is.
  if (evidence.error && evidence.refs.length === 0) {
    return (
      <View style={{ gap: 8, padding: 16, alignItems: 'flex-start' }}>
        <Alert variant="error">Couldn’t load this attempt’s evidence: {evidence.error}</Alert>
        <Button size="sm" variant="secondary" onPress={() => void evidence.reload()}>
          Try again
        </Button>
      </View>
    )
  }

  return (
    <View style={{ gap: 10, padding: 12 }}>
      {outcomeReason ? (
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>
          <Text style={{ fontWeight: '600', color: theme.text.primary }}>Step outcome: </Text>
          {outcomeReason}
        </Text>
      ) : null}
      <FeatureReviewSection
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
        {...(onSaveFile ? { onSaveFile } : {})}
      />
      <ComparisonOverlay
        pairs={pairs}
        openKey={openPairKey}
        onClose={() => setOpenPairKey(undefined)}
        baseSha={undefined}
        headSha={undefined}
        onRequestImage={evidence.requestImage}
        {...(onSaveFile ? { onSaveFile } : {})}
        projectId={projectId}
      />
    </View>
  )
}
