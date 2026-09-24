import { useState } from 'react'
import { Text, View } from 'react-native'

import {
  useVerifyAttemptEvidence,
  verifyAttemptFacts,
  verifyAttemptStatus,
  verifySectionProps,
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
  /** The verify attempt itself: its outcome, the gate's reason, its timing and its proof. */
  entry: ProcessLedgerEntry
  /** The attempt's name, e.g. "Verify · attempt 3". */
  title: string
  /** Native host's file saver; enables downloads when provided. */
  onSaveFile?: SaveFileHandler
}

/**
 * Native peer of
 * [web's `VerificationReview`](../../../web/compound/process/VerificationReview.tsx).
 * One verify attempt as a small sign-off: what data it ran on, what the gate
 * concluded (or that a person accepted it over the gate), the reviewer's
 * verdict, and exactly the proof the gate judged, behind the story sign-off's
 * own capability tabs, with the attempt's own time and cost. An entry with no
 * recorded proof falls back to what the reviewer filed in the attempt's window.
 */
export default function VerificationReview({
  projectId,
  review,
  entry,
  title,
  onSaveFile,
}: VerificationReviewProps) {
  const { theme } = useNativeTheme()
  const attempt = useVerifyAttemptEvidence(projectId, entry, review)
  const [openPairKey, setOpenPairKey] = useState<string | undefined>()

  const status = verifyAttemptStatus(entry)

  // Only until the first load lands: a live re-pull (every run or chat event)
  // must not swap the whole section back to "loading" while nothing is filed yet.
  if (!attempt.loaded && !attempt.hasAny) {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>Loading the evidence…</Text>
      </View>
    )
  }
  // A load that FAILED is not "the reviewer filed nothing" — say which it is.
  if (attempt.error && !attempt.hasAny) {
    return (
      <View style={{ gap: 8, padding: 16, alignItems: 'flex-start' }}>
        <Alert variant="error">Couldn’t load this attempt’s evidence: {attempt.error}</Alert>
        <Button size="sm" variant="secondary" onPress={() => void attempt.reload()}>
          Try again
        </Button>
      </View>
    )
  }

  return (
    <View style={{ gap: 10, padding: 12 }}>
      <FeatureReviewSection
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
        {...(onSaveFile ? { onSaveFile } : {})}
      />
      <ComparisonOverlay
        pairs={attempt.evidence.pairs}
        openKey={openPairKey}
        onClose={() => setOpenPairKey(undefined)}
        baseSha={undefined}
        headSha={undefined}
        onRequestImage={attempt.requestImage}
        {...(onSaveFile ? { onSaveFile } : {})}
        projectId={projectId}
      />
    </View>
  )
}
