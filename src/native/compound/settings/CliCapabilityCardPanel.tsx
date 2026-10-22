import { Text, View } from 'react-native'

import type {
  CliCapabilityCardView,
  CliCapabilityTone,
} from '../../../headless/utils/cliCapabilityCardTypes'
import { nativeLightStatus, nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export interface CliCapabilityCardPanelProps {
  view: CliCapabilityCardView
}

/**
 * A capability battery's result card, laid out for touch — the native peer of
 * the web `CliCapabilityCardPanel`, rendering the same headless
 * `cliCapabilityCardView`: passes, the median call, what it cost (a plan's
 * share as `$?` with its plan beside it), when it finished, and each probe.
 */
export function CliCapabilityCardPanel({ view }: CliCapabilityCardPanelProps) {
  const { theme } = useNativeTheme()
  const probeToneColor: Record<CliCapabilityTone, string> = {
    pass: nativeLightStatus.done.bg,
    fail: nativeLightStatus.stuck.bg,
    none: theme.text.secondary,
  }
  return (
    <View
      style={{
        borderRadius: nativeRadii[1],
        backgroundColor: theme.surface.muted,
        paddingHorizontal: nativeSpace[5],
        paddingVertical: nativeSpace[4],
        gap: nativeSpace[2],
        borderWidth: 1,
        borderColor: theme.border.default,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: nativeSpace[3],
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: '500', color: theme.text.primary }}>
          {view.headline}
        </Text>
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>{view.latency}</Text>
        {view.cost ? (
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>{view.cost}</Text>
        ) : null}
        {view.finished ? (
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>{view.finished}</Text>
        ) : null}
      </View>
      {view.probes.map((probe) => (
        <View
          key={probe.id}
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: nativeSpace[3],
          }}
        >
          <Text style={{ width: 40, fontSize: 12, color: probeToneColor[probe.tone] }}>
            {probe.status}
          </Text>
          <View style={{ flex: 1, gap: nativeSpace[1] }}>
            <Text style={{ fontSize: 12, color: theme.text.primary }}>{probe.label}</Text>
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>{probe.detail}</Text>
            {probe.cases.map((probeCase) => (
              <View
                key={probeCase.key}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: nativeSpace[2],
                }}
              >
                <Text style={{ fontSize: 12, color: probeToneColor[probeCase.tone] }}>
                  {probeCase.mark}
                </Text>
                <Text style={{ flex: 1, fontSize: 12, color: theme.text.secondary }}>
                  {probeCase.detail}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  )
}
