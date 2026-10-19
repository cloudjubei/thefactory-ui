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
 * An attempt that went in circles, as a major issue: the manager's
 * recommendation first when it gave one ("Going in circles — the manager
 * recommends"), then how it ran out and the evidence a line each.
 */
export function CirclingNotice({ view }: { view: ProcessCirclingView }) {
  const { status } = useNativeTheme()
  const color = status.stuck.softFg
  const recommendation = view.recommendation
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
      {recommendation ? (
        <View
          style={{
            gap: 2,
            paddingBottom: nativeSpace[1],
            borderBottomWidth: 1,
            borderBottomColor: status.stuck.softBorder,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color, textTransform: 'uppercase' }}>
            {recommendation.heading}
          </Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color }}>{recommendation.text}</Text>
        </View>
      ) : (
        <Text style={{ fontSize: 11, fontWeight: '700', color, textTransform: 'uppercase' }}>
          {view.label}
        </Text>
      )}
      <Text style={{ fontSize: 12.5, fontWeight: '600', color }}>{view.headline}</Text>
      {view.evidence.map((line) => (
        <Text key={line} style={{ fontSize: 11.5, color }}>
          {line}
        </Text>
      ))}
    </View>
  )
}

export default CirclingNotice
