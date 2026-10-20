import { Text, View } from 'react-native'
import type { ProcessStepState } from 'thefactory-tools/types'

import {
  formatFriendlyTimestamp,
  processSignoffDiscussDraft,
  processDroppedChangeRows,
  processSignoffRecord,
  PROCESS_SIGNOFF_RECORD_TEXT,
  REQUEST_PROOF_HEADING,
  useRunChatDraft,
  type ProcessRun,
  type ProcessSignoffDecisionView,
} from '../../../../headless'
import { nativeRadii, nativeSpace } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import { IconChat } from '../../../icons'
import { Button } from '../../../primitives/Button'
import RichText from '../../files/RichText'
import StorySignoffReview from '../StorySignoffReview'
import type { StepPanelTarget } from './StepScreen'

export type SignoffRecordProps = {
  run: ProcessRun
  state: ProcessStepState
  onOpen: (target: StepPanelTarget) => void
}

const decidedAt = (at: number) => formatFriendlyTimestamp(new Date(at).toISOString())

function DecisionPill({ decision }: { decision: ProcessSignoffDecisionView }) {
  const { status } = useNativeTheme()
  const v = status[decision.tone]
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: nativeRadii.round,
        borderWidth: 1,
        borderColor: v.softBorder,
        backgroundColor: v.softBg,
        paddingHorizontal: 7,
        paddingVertical: 1,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '600', color: v.softFg }}>{decision.label}</Text>
    </View>
  )
}

/**
 * Native peer of web's `SignoffRecord`: a decided sign-off, kept on its step —
 * what was chosen, by whom and where, when, in their words and how approved work came in,
 * the earlier decisions under it, a way to talk it over in the run's chat, and
 * the review they decided on, read-only.
 */
export default function SignoffRecord({ run, state, onOpen }: SignoffRecordProps) {
  const { theme, status } = useNativeTheme()
  const discuss = useRunChatDraft()
  const record = processSignoffRecord(run, state)
  if (!record) return null
  const { latest, earlier } = record
  const tone = status[latest.tone]
  const small = { fontSize: 12, color: theme.text.secondary }
  const caption = {
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
    color: theme.text.muted,
  }
  return (
    <View style={{ gap: nativeSpace[3] }}>
      <View
        accessibilityLabel={PROCESS_SIGNOFF_RECORD_TEXT.heading}
        style={{
          gap: 8,
          padding: 12,
          borderRadius: nativeRadii[3],
          borderWidth: 1,
          borderColor: tone.softBorder,
          backgroundColor: tone.softBg,
        }}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 12.5, fontWeight: '600', color: theme.text.primary }}>
            {PROCESS_SIGNOFF_RECORD_TEXT.heading}
          </Text>
          <DecisionPill decision={latest} />
          <Text style={small}>
            {latest.decidedBy ? (
              <Text style={{ fontWeight: '600', color: theme.text.primary }}>
                {latest.decidedBy} ·{' '}
              </Text>
            ) : null}
            {PROCESS_SIGNOFF_RECORD_TEXT.attempt(latest.attempt)} · {decidedAt(latest.at)}
          </Text>
        </View>
        {latest.integration ? (
          <Text style={small}>
            {PROCESS_SIGNOFF_RECORD_TEXT.integration}{' '}
            <Text style={{ fontWeight: '600', color: theme.text.primary }}>
              {latest.integration}
            </Text>
          </Text>
        ) : null}
        {latest.note ? (
          <RichText text={latest.note} typedReferences textColor={theme.text.primary} />
        ) : null}
        {latest.requestedProof ? (
          <Text style={small}>
            {REQUEST_PROOF_HEADING}: {latest.requestedProof.join(' · ')}
          </Text>
        ) : null}
        {latest.merged ? <Text style={small}>{latest.merged}</Text> : null}
        {discuss ? (
          <Button
            size="sm"
            variant="secondary"
            accessibilityHint={PROCESS_SIGNOFF_RECORD_TEXT.discussDetail}
            onPress={() => discuss(processSignoffDiscussDraft(latest))}
            style={{ alignSelf: 'flex-start' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <IconChat size={14} color={theme.text.primary} />
              <Text style={{ fontSize: 13, color: theme.text.primary }}>
                {PROCESS_SIGNOFF_RECORD_TEXT.discuss}
              </Text>
            </View>
          </Button>
        ) : null}
      </View>

      {earlier.length > 0 ? (
        <View style={{ gap: 6 }}>
          <Text style={caption}>{PROCESS_SIGNOFF_RECORD_TEXT.earlier}</Text>
          {earlier.map((d) => (
            <View key={`${d.entryId}:${d.at}`} style={{ gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <DecisionPill decision={d} />
                <Text style={[small, { flexShrink: 1 }]}>
                  {d.decidedBy ? `${d.decidedBy} · ` : null}
                  {PROCESS_SIGNOFF_RECORD_TEXT.attempt(d.attempt)} · {decidedAt(d.at)}
                </Text>
              </View>
              {d.note ? (
                <Text numberOfLines={2} style={small}>
                  {d.note}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {run.storyId ? (
        <View style={{ gap: 6 }}>
          <Text style={caption}>{PROCESS_SIGNOFF_RECORD_TEXT.review}</Text>
          <StorySignoffReview
            projectId={run.projectId}
            storyId={run.storyId}
            storyRunId={run.id}
            droppedAccepted={processDroppedChangeRows(run)}
            onOpenStep={onOpen}
          />
        </View>
      ) : null}
    </View>
  )
}
