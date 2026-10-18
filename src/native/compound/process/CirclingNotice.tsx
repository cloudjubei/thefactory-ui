import { Text, View } from 'react-native'

import type { ProcessCirclingView } from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

/** The "Going in circles" flag on a step's row — the same words wherever the step is shown. */
export function CirclingChip({ view }: { view: ProcessCirclingView }) {
  const { status } = useNativeTheme()
  return (
    <View
      accessibilityLabel={`${view.label}: ${view.headline}`}
      style={{
        backgroundColor: status.stuck.softBg,
        borderColor: status.stuck.softBorder,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 6,
        paddingVertical: 1,
      }}
    >
      <Text style={{ fontSize: 10.5, fontWeight: '600', color: status.stuck.softFg }}>
        {view.label}
      </Text>
    </View>
  )
}

/**
 * An attempt that went in circles, as a major issue: the flag, how it ran out,
 * the evidence a line each, and — on a stop — what trying again needs.
 */
export function CirclingNotice({
  view,
  showHint = true,
}: {
  view: ProcessCirclingView
  /** Say what a retry needs — on a stop the person answers, not on a card that only reports. */
  showHint?: boolean
}) {
  const { status } = useNativeTheme()
  const color = status.stuck.softFg
  return (
    <View
      style={{
        gap: nativeSpace[1],
        borderRadius: nativeRadii[2],
        paddingHorizontal: nativeSpace[2],
        paddingVertical: nativeSpace[2],
        backgroundColor: status.stuck.softBg,
        borderColor: status.stuck.softBorder,
        borderWidth: 1,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '700', color, textTransform: 'uppercase' }}>
        {view.label}
      </Text>
      <Text style={{ fontSize: 12.5, fontWeight: '600', color }}>{view.headline}</Text>
      {view.evidence.map((line) => (
        <Text key={line} style={{ fontSize: 11.5, color }}>
          {line}
        </Text>
      ))}
      {showHint ? (
        <Text style={{ fontSize: 11.5, fontWeight: '500', color }}>{view.hint}</Text>
      ) : null}
    </View>
  )
}

export default CirclingNotice
