import { Text, View, type TextStyle } from 'react-native'

import {
  PROCESS_TIME_QUEUED_LABEL,
  PROCESS_TIME_WAITING_LABEL,
  type ProcessTimeDetailsView,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export interface TimeDetailsBodyProps {
  view: ProcessTimeDetailsView
}

/**
 * Where a time went, laid out for touch — the native peer of the web
 * `TimeDetailsPanel`, rendering the same headless `processTimeDetailsView` so
 * the two clients split a time identically. Hosted by `TimeDetailsSheet`.
 */
export default function TimeDetailsBody({ view }: TimeDetailsBodyProps) {
  const { theme } = useNativeTheme()
  const divider = {
    paddingTop: nativeSpace[3],
    borderTopWidth: 1,
    borderTopColor: theme.border.subtle,
  } as const
  const number: TextStyle = {
    fontSize: 13,
    color: theme.text.primary,
    fontVariant: ['tabular-nums'],
  }
  return (
    <View style={{ gap: nativeSpace[3] }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>Total</Text>
        <Text style={[number, { fontWeight: '600' }]}>{view.total}</Text>
      </View>
      {view.rows.map((row) => (
        <View key={row.key} style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <Text style={{ fontSize: 13, color: theme.text.secondary }}>{row.label}</Text>
            <Text style={number}>
              {row.value}
              <Text style={{ color: theme.text.muted }}>{`  ${row.share}`}</Text>
            </Text>
          </View>
          <View
            style={{
              height: 4,
              borderRadius: nativeRadii.round,
              overflow: 'hidden',
              backgroundColor: theme.surface.overlay,
            }}
            aria-hidden
          >
            <View
              style={{
                height: 4,
                width: `${Math.round(row.fraction * 100)}%`,
                backgroundColor: theme.accent.primary,
              }}
            />
          </View>
          <Text style={{ fontSize: 11, color: theme.text.muted }}>{row.hint}</Text>
        </View>
      ))}
      {view.tools.length > 0 ? (
        <View style={[divider, { gap: 2 }]}>
          <Text style={{ fontSize: 12, color: theme.text.muted }}>Slowest tools</Text>
          {view.tools.map((tool) => (
            <View
              key={tool.label}
              style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}
            >
              <Text
                numberOfLines={1}
                style={{ flexShrink: 1, fontSize: 12, color: theme.text.secondary }}
              >
                {tool.label}
              </Text>
              <Text style={number}>{tool.value}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {view.manager ? (
        <View style={[divider, { flexDirection: 'row', justifyContent: 'space-between', gap: 12 }]}>
          <Text style={{ flexShrink: 1, fontSize: 12, color: theme.text.secondary }}>
            {view.manager.label}
          </Text>
          <Text style={[number, { fontSize: 12 }]}>{view.manager.value}</Text>
        </View>
      ) : null}
      {view.waiting ? (
        <View style={[divider, { flexDirection: 'row', justifyContent: 'space-between', gap: 12 }]}>
          <Text style={{ flexShrink: 1, fontSize: 12, color: theme.text.muted }}>
            {PROCESS_TIME_WAITING_LABEL}
          </Text>
          <Text style={[number, { color: theme.text.muted }]}>{view.waiting}</Text>
        </View>
      ) : null}
      {view.queued ? (
        <View style={[divider, { flexDirection: 'row', justifyContent: 'space-between', gap: 12 }]}>
          <Text style={{ flexShrink: 1, fontSize: 12, color: theme.text.muted }}>
            {PROCESS_TIME_QUEUED_LABEL}
          </Text>
          <Text style={[number, { color: theme.text.muted }]}>{view.queued}</Text>
        </View>
      ) : null}
    </View>
  )
}
