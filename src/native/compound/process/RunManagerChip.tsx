import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import type { ProcessRunManagerView } from '../../../headless'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type RunManagerChipProps = {
  view: ProcessRunManagerView
  /** Switch the manager on or off; absent once the run has ended, when it only shows it. */
  onSwitch?: (enabled: boolean) => Promise<boolean>
}

/** Native peer of web's `RunManagerChip`. */
export function RunManagerChip({ view, onSwitch }: RunManagerChipProps) {
  const { theme, status } = useNativeTheme()
  const [saving, setSaving] = useState(false)
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: view.enabled, disabled: !onSwitch || saving }}
      accessibilityLabel={view.switchLabel}
      accessibilityHint={view.switchDetail}
      disabled={!onSwitch || saving}
      onPress={() => {
        if (!onSwitch) return
        setSaving(true)
        void onSwitch(!view.enabled).finally(() => setSaving(false))
      }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 28,
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: theme.border.subtle,
        borderRadius: nativeRadii[2],
      }}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: view.enabled ? status.done.bg : status.empty.softBorder,
        }}
      />
      <Text style={{ fontSize: 11, color: theme.text.secondary }}>{view.switchLabel}</Text>
    </Pressable>
  )
}
