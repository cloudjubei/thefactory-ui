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
import { useCanonicalizeReferences } from '../../../headless/contexts/ReferenceRenderingContext'
import ReferenceTextarea from '../files/ReferenceTextarea'

export type ProcessGroupParkReviewProps = {
  group: ProcessGroupRun
  /** Send the answer; resolves whether it was taken. */
  onResume: (input: ProcessGroupResumeInput) => Promise<boolean>
}

/**
 * Native peer of
 * [web's `ProcessGroupParkReview`](../../../web/compound/process/ProcessGroupParkReview.tsx).
 * What only the group run can answer, in place: a project that stopped (run it
 * again or skip it), a merged project that does not build, or a merge that
 * failed. Each project's sign-off is answered on its own run, not here. Only
 * the answers the park offers are shown.
 */
export default function ProcessGroupParkReview({ group, onResume }: ProcessGroupParkReviewProps) {
  const { theme, status } = useNativeTheme()
  const view = processGroupParkView(group)
  const [modes, setModes] = useState<Record<string, ProcessIntegrationMode>>({})
  const [note, setNote] = useState('')
  const canonicalize = useCanonicalizeReferences()
  const [busy, setBusy] = useState(false)
  if (!view) return null

  const modeOf = (legId: string, fallback: ProcessIntegrationMode) => modes[legId] ?? fallback
  const chosenModes = Object.fromEntries(
    view.toMerge.map((m) => [m.leg.id, modeOf(m.leg.id, m.mode)]),
  )

  const answer = async (choice: ProcessGroupResumeChoice) => {
    setBusy(true)
    const taken = await onResume(
      processGroupResumeInput(choice, { modes: chosenModes, note: canonicalize(note) }),
    )
    setBusy(false)
    if (taken) setNote('')
  }

  return (
    <View
      style={{
        gap: nativeSpace[3],
        borderWidth: 1,
        borderRadius: nativeRadii[3],
        borderColor: status.on_hold.softBorder,
        backgroundColor: status.on_hold.softBg,
        padding: nativeSpace[3],
      }}
    >
      <Text style={{ fontSize: 12.5, fontWeight: '500', color: theme.text.primary }}>
        {view.message}
      </Text>

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
        {view.choices.map((c) => (
          <Button
            key={c.choice}
            size="sm"
            variant={c.primary ? 'primary' : c.choice === 'abandon' ? 'ghost' : 'secondary'}
            accessibilityHint={c.detail}
            disabled={busy}
            onPress={() => void answer(c.choice)}
          >
            {c.label}
          </Button>
        ))}
      </View>
    </View>
  )
}
