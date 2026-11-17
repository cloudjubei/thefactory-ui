import { Pressable, Text, View } from 'react-native'
import { useChatMessagingSetting } from '../../../headless/hooks/useChatMessagingSetting'
import {
  CHAT_MESSAGING_SETTING_HINT,
  CHAT_MESSAGING_SETTING_LABEL,
} from '../../../headless/utils/chatMessagingSetting'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Switch } from '../../primitives/Switch'

export default function ChatMessagingSetting({ disabled = false }: { disabled?: boolean }) {
  const { theme, status } = useNativeTheme()
  const { allowed, ready, loading, saving, error, setAllowed, retry } = useChatMessagingSetting()
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Switch
          accessibilityLabel={CHAT_MESSAGING_SETTING_LABEL}
          checked={allowed}
          disabled={disabled || !ready || loading || saving}
          onCheckedChange={(next) => void setAllowed(next)}
        />
        <Text style={{ flex: 1, fontSize: 14, color: theme.text.primary }}>
          {CHAT_MESSAGING_SETTING_LABEL}
        </Text>
      </View>
      <Text style={{ fontSize: 12, color: theme.text.secondary }}>
        {CHAT_MESSAGING_SETTING_HINT}
      </Text>
      {error ? (
        <View accessibilityRole="alert" style={{ gap: 4 }}>
          <Text style={{ fontSize: 12, color: status.stuck.softFg }}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={() => void retry()}>
            <Text style={{ fontSize: 12, color: theme.accent.primary }}>Reload setting</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  )
}
