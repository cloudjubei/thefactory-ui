import { useState } from 'react'
import { Text, View } from 'react-native'

import {
  PROCESS_GROUP_MODE_LABELS,
  processGroupParkView,
  processGroupResumeInput,
  type ProcessGroupResumeChoice,
  type ProcessGroupResumeInput,
  type ProcessGroupRun,
  type ProcessIntegrationMode,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'
import SegmentedControl from '../../primitives/SegmentedControl'
import { Switch } from '../../primitives/Switch'
import { useCanonicalizeReferences } from '../../../headless/contexts/ReferenceRenderingContext'
import ReferenceTextarea from '../files/ReferenceTextarea'

export type ProcessGroupSignoffReviewProps = {
  group: ProcessGroupRun
  /** Send the answer; resolves whether it was taken. */
  onResume: (input: ProcessGroupResumeInput) => Promise<boolean>
}

/**
 * Native peer of
 * [web's `ProcessGroupSignoffReview`](../../../web/compound/process/ProcessGroupSignoffReview.tsx).
 * What a group run waits on the person for, answered in place: the one
 * sign-off of the whole change (each project merged the way chosen, or chosen
 * projects sent back), an early merge of a project others build on, or a
 * project that stopped. Only the answers the park offers are shown.
 */
export default function ProcessGroupSignoffReview({
  group,
  onResume,
}: ProcessGroupSignoffReviewProps) {
  const { theme, status } = useNativeTheme()
  const view = processGroupParkView(group)
  const [modes, setModes] = useState<Record<string, ProcessIntegrationMode>>({})
  const [sendBack, setSendBack] = useState<string[] | undefined>(undefined)
  const [note, setNote] = useState('')
  const canonicalize = useCanonicalizeReferences()
  const [busy, setBusy] = useState(false)
  if (!view) return null

  const modeOf = (legId: string, fallback: ProcessIntegrationMode) => modes[legId] ?? fallback
  const chosenModes = Object.fromEntries(
    view.toMerge.map((m) => [m.leg.id, modeOf(m.leg.id, m.mode)]),
  )
  const atSignOff = view.toMerge.map((m) => m.leg)
  const picksLegs = group.park?.reason === 'sign-off' && atSignOff.length > 1

  const answer = async (choice: ProcessGroupResumeChoice) => {
    if (choice === 'request-changes' && picksLegs && sendBack === undefined) {
      setSendBack(atSignOff.map((l) => l.id))
      return
    }
    setBusy(true)
    const taken = await onResume(
      processGroupResumeInput(choice, {
        modes: chosenModes,
        note: canonicalize(note),
        ...(sendBack ? { legIds: sendBack } : {}),
      }),
    )
    setBusy(false)
    if (taken) {
      setNote('')
      setSendBack(undefined)
    }
  }

  const sectionLabel = {
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
    color: theme.text.muted,
  }

  return (
    <View
      style={{
        gap: nativeSpace[3],
        borderWidth: 1,
        borderRadius: nativeRadii[3],
        borderColor: status.review.softBorder,
        backgroundColor: status.review.softBg,
        padding: nativeSpace[3],
      }}
    >
      <Text style={{ fontSize: 12.5, fontWeight: '500', color: theme.text.primary }}>
        {view.message}
      </Text>

      {view.toMerge.length > 0 && sendBack === undefined ? (
        <View style={{ gap: 6 }}>
          <Text style={sectionLabel}>How each project is merged</Text>
          {view.toMerge.map(({ leg, mode }) => (
            <View
              key={leg.id}
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: nativeSpace[2],
              }}
            >
              <Text
                numberOfLines={1}
                style={{ flex: 1, minWidth: 0, fontSize: 12, color: theme.text.primary }}
              >
                {leg.projectId} <Text style={{ color: theme.text.muted }}>· {leg.title}</Text>
              </Text>
              <SegmentedControl
                size="sm"
                ariaLabel={`How ${leg.projectId} is merged`}
                value={modeOf(leg.id, mode)}
                onChange={(v) =>
                  setModes((prev) => ({ ...prev, [leg.id]: v as ProcessIntegrationMode }))
                }
                options={view.modes.map((m) => ({ value: m, label: PROCESS_GROUP_MODE_LABELS[m] }))}
              />
            </View>
          ))}
        </View>
      ) : null}

      {sendBack !== undefined ? (
        <View style={{ gap: 4 }}>
          <Text style={sectionLabel}>Send back</Text>
          {atSignOff.map((leg) => (
            <View
              key={leg.id}
              style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}
            >
              <Switch
                checked={sendBack.includes(leg.id)}
                accessibilityLabel={`Send ${leg.projectId} back`}
                onCheckedChange={(checked) =>
                  setSendBack((prev) =>
                    checked
                      ? [...(prev ?? []), leg.id]
                      : (prev ?? []).filter((id) => id !== leg.id),
                  )
                }
              />
              <Text style={{ flex: 1, fontSize: 12, color: theme.text.primary }}>
                {leg.projectId} <Text style={{ color: theme.text.muted }}>· {leg.title}</Text>
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <ReferenceTextarea
        rows={2}
        value={note}
        onChangeText={setNote}
        placeholder="A note for the agents (optional)"
        textInputProps={{ accessibilityLabel: 'A note for the agents' }}
      />

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: nativeSpace[2],
        }}
      >
        {sendBack !== undefined ? (
          <>
            <Button
              size="sm"
              loading={busy}
              disabled={sendBack.length === 0}
              onPress={() => void answer('request-changes')}
            >
              {`Send ${sendBack.length === 1 ? 'it' : 'them'} back`}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onPress={() => setSendBack(undefined)}
            >
              Cancel
            </Button>
          </>
        ) : (
          view.choices.map((c) => (
            <Button
              key={c.choice}
              size="sm"
              variant={
                c.primary
                  ? 'primary'
                  : c.choice === 'abandon' || c.choice === 'reject'
                    ? 'ghost'
                    : 'secondary'
              }
              accessibilityHint={c.detail}
              disabled={busy}
              onPress={() => void answer(c.choice)}
            >
              {c.label}
            </Button>
          ))
        )}
      </View>
    </View>
  )
}
