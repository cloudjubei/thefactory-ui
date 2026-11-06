import { Text, View } from 'react-native'

import type { AccessRecordRowView } from '../../../headless'
import { nativeFontFamilies, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type AccessRecordListProps = {
  rows: readonly AccessRecordRowView[]
}

/**
 * Native peer of web's `AccessRecordList`: who, what they did and when, then
 * the tool and the project, then why it was allowed.
 */
export function AccessRecordList({ rows }: AccessRecordListProps) {
  const { theme } = useNativeTheme()
  const secondary = { fontSize: 12.5, lineHeight: 18, color: theme.text.secondary } as const
  return (
    <View style={{ gap: nativeSpace[3] }}>
      {rows.map((row) => (
        <View key={row.key} style={{ gap: 2 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
              {row.who}
            </Text>
            <Text style={{ fontSize: 13, color: theme.text.secondary }}>{row.what}</Text>
            <Text style={{ marginLeft: 'auto', fontSize: 11, color: theme.text.muted }}>
              {row.when}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>
            <Text style={{ fontFamily: nativeFontFamilies.mono, fontSize: 11 }}>{row.tool}</Text>
            {' · '}
            <Text style={{ fontFamily: nativeFontFamilies.mono, fontSize: 11 }}>{row.target}</Text>
          </Text>
          <Text style={secondary}>{row.why}</Text>
        </View>
      ))}
    </View>
  )
}
