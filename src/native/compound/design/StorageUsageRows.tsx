import { Text, View } from 'react-native'
import { storageUsageBreakdown } from '../../../headless'
import type { ProjectStorageUsage } from '../../../headless/api'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

/** Native peer of web's `StorageUsageRows`: a project's usage by store — design, run proof, UI tests, mobile tests. */
export default function StorageUsageRows({ usage }: { usage: ProjectStorageUsage }) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: nativeSpace[1] }}>
      {storageUsageBreakdown(usage).map((row) => (
        <View
          key={row.key}
          style={{ flexDirection: 'row', justifyContent: 'space-between', gap: nativeSpace[8] }}
        >
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>{row.label}</Text>
          <Text style={{ fontSize: 12, color: theme.text.primary, fontVariant: ['tabular-nums'] }}>
            {row.size}
          </Text>
        </View>
      ))}
    </View>
  )
}
