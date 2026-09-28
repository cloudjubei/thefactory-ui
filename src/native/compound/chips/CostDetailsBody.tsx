import { Text, View } from 'react-native'

import type { CostDetailsLine, CostDetailsView } from '../../../headless'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export interface CostDetailsBodyProps {
  view: CostDetailsView
}

function Lines({ lines }: { lines: CostDetailsLine[] }) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: 2 }}>
      {lines.map((line) => (
        <View
          key={line.label}
          style={{ flexDirection: 'row', justifyContent: 'space-between', gap: nativeSpace[4] }}
        >
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>{line.label}</Text>
          <Text style={{ fontSize: 13, color: theme.text.primary, fontVariant: ['tabular-nums'] }}>
            {line.value}
          </Text>
        </View>
      ))}
    </View>
  )
}

/**
 * A cost's details, laid out for touch — the native peer of the web
 * `CostDetailsPanel`, rendering the same headless `costDetailsView` so the two
 * clients word a cost identically. Hosted by `CostDetailsSheet` and by the
 * per-message usage sheet.
 */
export default function CostDetailsBody({ view }: CostDetailsBodyProps) {
  const { theme } = useNativeTheme()
  const divider = {
    paddingTop: nativeSpace[3],
    borderTopWidth: 1,
    borderTopColor: theme.border.subtle,
  } as const
  return (
    <View style={{ gap: nativeSpace[3] }}>
      <Lines lines={view.summary} />
      {view.rows.map((row) => (
        <View key={row.key} style={[divider, { gap: nativeSpace[2] }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <Text
              numberOfLines={1}
              style={{ flexShrink: 1, fontSize: 13, fontWeight: '600', color: theme.text.primary }}
            >
              {row.model}
            </Text>
            <Text
              style={{ fontSize: 13, color: theme.text.primary, fontVariant: ['tabular-nums'] }}
            >
              {row.charged}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>
            {[row.provider, row.modelId].filter(Boolean).join(' · ')}
          </Text>
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>{row.billingLabel}</Text>
          <Lines lines={row.tokens} />
          <Text style={{ fontSize: 12, color: theme.text.muted }}>{row.listValue}</Text>
        </View>
      ))}
      {view.notes.length > 0 ? (
        <View style={[divider, { gap: nativeSpace[2] }]}>
          {view.notes.map((note) => (
            <Text key={note} style={{ fontSize: 12, lineHeight: 16, color: theme.text.muted }}>
              {note}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  )
}
