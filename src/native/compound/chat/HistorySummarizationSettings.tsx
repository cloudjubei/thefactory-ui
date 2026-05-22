import { Text, View } from 'react-native'
import { Switch } from '../../primitives/Switch'
import { Slider } from '../../primitives/Slider'
import { nativeLightTheme, nativeSpace } from '../../../tokens/native'

export type HistorySummarization = {
  enabled: boolean
  keepLastTurns?: number
  maxOpsInSummary?: number
}

export type HistorySummarizationSettingsProps = {
  historySummarization?: HistorySummarization
  persistSettings: (patch: { historySummarization?: HistorySummarization }) => Promise<void> | void
}

/**
 * Native peer of web's `HistorySummarizationSettings`. Rendered in the
 * `ChatSettingsDropdown`'s `extraContent` slot.
 */
export default function HistorySummarizationSettings({
  historySummarization,
  persistSettings,
}: HistorySummarizationSettingsProps) {
  const enabled = !!historySummarization?.enabled
  const keepLastTurns = historySummarization?.keepLastTurns ?? 4
  const maxOpsInSummary = historySummarization?.maxOpsInSummary ?? 30

  const patch = (next: Partial<HistorySummarization>) => {
    const current: HistorySummarization = historySummarization ?? { enabled: false }
    void persistSettings({ historySummarization: { ...current, ...next } })
  }

  return (
    <View
      style={{
        gap: nativeSpace[3],
        paddingTop: nativeSpace[3],
        borderTopWidth: 1,
        borderTopColor: nativeLightTheme.border.subtle,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: nativeSpace[3],
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontWeight: '500', color: nativeLightTheme.text.secondary }}>
            History summarization
          </Text>
          <Text style={{ fontSize: 11, color: nativeLightTheme.text.muted, marginTop: 2 }}>
            Summarize older messages to reduce token usage while preserving context
          </Text>
        </View>
        <Switch checked={enabled} onCheckedChange={(c) => patch({ enabled: c })} />
      </View>

      {enabled ? (
        <View style={{ gap: nativeSpace[3], paddingLeft: nativeSpace[1] }}>
          <SliderRow
            label="Keep last turns"
            value={keepLastTurns}
            min={1}
            max={20}
            onChange={(v) => patch({ keepLastTurns: v })}
          />
          <SliderRow
            label="Max ops in summary"
            value={maxOpsInSummary}
            min={5}
            max={100}
            step={5}
            onChange={(v) => patch({ maxOpsInSummary: v })}
          />
        </View>
      ) : null}
    </View>
  )
}

function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
}) {
  return (
    <View style={{ gap: nativeSpace[1] }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 12, fontWeight: '500', color: nativeLightTheme.text.secondary }}>
          {label}
        </Text>
        <Text style={{ fontSize: 13, color: nativeLightTheme.text.secondary }}>{value}</Text>
      </View>
      <Slider value={value} min={min} max={max} step={step} onChange={onChange} />
    </View>
  )
}
