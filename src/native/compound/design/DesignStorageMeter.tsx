import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { STORAGE_WARNING_TEXT, storageUsageFraction, storageUsageSummary } from '../../../headless'
import type { GetProjectStorageUsageResponse } from '../../../headless/api'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconWarningTriangle } from '../../icons'
import StorageUsageRows from './StorageUsageRows'

export type DesignStorageMeterProps = {
  /** The project's usage with how every project's total stands; `undefined` until read. */
  usage: GetProjectStorageUsageResponse | undefined
}

/** Native peer of web's `DesignStorageMeter`: the project's usage, then every project's against the threshold. */
export function DesignStorageMeter({ usage }: DesignStorageMeterProps) {
  const { theme, status } = useNativeTheme()
  if (!usage) return null
  const fraction = Math.min(1, storageUsageFraction(usage.standing))
  return (
    <View
      accessibilityLabel={storageUsageSummary(usage)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[4] }}
    >
      <View
        style={{
          width: 64,
          height: 6,
          borderRadius: nativeRadii.round,
          overflow: 'hidden',
          backgroundColor: theme.surface.muted,
        }}
      >
        <View
          style={{
            width: `${Math.round(fraction * 100)}%`,
            height: '100%',
            borderRadius: nativeRadii.round,
            backgroundColor: usage.standing.over ? status.working.softFg : theme.accent.primary,
          }}
        />
      </View>
      <Text style={{ flexShrink: 1, fontSize: 12, color: theme.text.secondary }}>
        {storageUsageSummary(usage)}
      </Text>
    </View>
  )
}

/** Native peer of web's `DesignStorageWarning`: shown while every project's total is past the threshold, with what uses it. */
export function DesignStorageWarning({ usage }: DesignStorageMeterProps) {
  const { status } = useNativeTheme()
  const [open, setOpen] = useState(false)
  if (!usage?.standing.over) return null
  return (
    <View
      accessibilityRole="alert"
      style={{
        gap: nativeSpace[4],
        borderWidth: 1,
        borderRadius: nativeRadii[2],
        paddingHorizontal: nativeSpace[6],
        paddingVertical: nativeSpace[4],
        backgroundColor: status.working.softBg,
        borderColor: status.working.softBorder,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: nativeSpace[4] }}>
        <IconWarningTriangle size={16} color={status.working.softFg} />
        <Text style={{ flex: 1, fontSize: 12.5, color: status.working.softFg }}>
          {storageUsageSummary(usage)}. {STORAGE_WARNING_TEXT.body}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen((v) => !v)}
        hitSlop={8}
        style={{ alignSelf: 'flex-start', marginLeft: 24 }}
      >
        <Text
          style={{ fontSize: 12.5, color: status.working.softFg, textDecorationLine: 'underline' }}
        >
          {open ? STORAGE_WARNING_TEXT.hideBreakdown : STORAGE_WARNING_TEXT.showBreakdown}
        </Text>
      </Pressable>
      {open ? (
        <View style={{ marginLeft: 24, maxWidth: 320 }}>
          <StorageUsageRows usage={usage.usage} />
        </View>
      ) : null}
    </View>
  )
}
