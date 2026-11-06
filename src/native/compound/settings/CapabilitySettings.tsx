import { Text, View } from 'react-native'
import { useCapabilitySettings, type CapabilitySettingsOwner } from '../../../headless'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import CapabilitySettingsPanel from './CapabilitySettingsPanel'

export interface CapabilitySettingsProps {
  /** The project or the group whose capabilities these are. */
  owner: CapabilitySettingsOwner
}

/**
 * Native peer of [web's `CapabilitySettings`](../../../web/compound/settings/CapabilitySettings.tsx):
 * device automation, tool sets, and connector write-back, auto-merge and
 * auto-follow-up. Each stays off until it is turned on, and the badge says
 * what is on.
 */
export default function CapabilitySettings({ owner }: CapabilitySettingsProps) {
  const { theme } = useNativeTheme()
  const settings = useCapabilitySettings(owner)
  if (!settings.view) {
    return (
      <View testID="capability-settings" style={{ gap: nativeSpace[2] }}>
        <Text style={{ fontSize: 20, fontWeight: '600', color: theme.text.primary }}>
          Capabilities
        </Text>
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>
          {settings.error ?? 'Loading…'}
        </Text>
      </View>
    )
  }
  return (
    <CapabilitySettingsPanel
      view={settings.view}
      error={settings.error}
      busy={settings.busy}
      onToggle={settings.toggle}
      onInherit={settings.inherit}
    />
  )
}
