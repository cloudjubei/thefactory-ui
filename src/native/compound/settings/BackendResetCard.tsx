import { Text, View } from 'react-native'

import { BACKEND_RESET_BODY, BACKEND_RESET_LABEL, BACKEND_RESET_TITLE } from '../../../headless'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'

export type BackendResetCardProps = {
  disabled: boolean
  /** Clears both URL and token, which returns the person to the login screen. */
  onReset: () => void
}

/** "Reset connection" in the backend connection settings, as on web and desktop. */
export default function BackendResetCard({ disabled, onReset }: BackendResetCardProps) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        borderRadius: nativeRadii[3],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.raised,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>
          {BACKEND_RESET_TITLE}
        </Text>
        <Text style={{ fontSize: 12, color: theme.text.muted }}>{BACKEND_RESET_BODY}</Text>
      </View>
      <Button size="sm" variant="ghost" disabled={disabled} onPress={onReset}>
        {BACKEND_RESET_LABEL}
      </Button>
    </View>
  )
}
