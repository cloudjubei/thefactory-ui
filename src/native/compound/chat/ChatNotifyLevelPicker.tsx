import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { ChatContext } from '../../../headless/api'
import { useChatNotifyLevel } from '../../../headless/hooks/useChatNotifyLevel'
import {
  CHAT_NOTIFY_SAVE_FAILED,
  NOTIFY_ME_TITLE,
} from '../../../headless/utils/chatNotifyConstants'
import type { ChatNotifyLevel } from '../../../headless/utils/chatNotifyTypes'
import { red } from '../../../tokens/colors'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconCheck } from '../../icons'

export type ChatNotifyLevelPickerProps = {
  context: ChatContext
  onPicked?: () => void
}

/** Native peer of web's `ChatNotifyLevelPicker`. */
export default function ChatNotifyLevelPicker({ context, onPicked }: ChatNotifyLevelPickerProps) {
  const { theme } = useNativeTheme()
  const { options, setLevel } = useChatNotifyLevel(context)
  const [failed, setFailed] = useState(false)
  const pick = (level: ChatNotifyLevel | undefined) => {
    setFailed(false)
    setLevel(level)
      .then(() => onPicked?.())
      .catch(() => setFailed(true))
  }
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={NOTIFY_ME_TITLE} style={{ gap: 2 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          color: theme.text.secondary,
          paddingHorizontal: 12,
          paddingBottom: 6,
        }}
      >
        {NOTIFY_ME_TITLE}
      </Text>
      {options.map((option) => (
        <Pressable
          key={option.value ?? 'default'}
          accessibilityRole="radio"
          accessibilityState={{ checked: option.selected }}
          onPress={() => pick(option.value)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: pressed ? theme.surface.hover : 'transparent',
          })}
        >
          <View style={{ width: 16, alignItems: 'center' }}>
            {option.selected ? <IconCheck size={14} color={theme.text.primary} /> : null}
          </View>
          <Text style={{ fontSize: 14, color: theme.text.primary }}>{option.label}</Text>
        </Pressable>
      ))}
      {failed ? (
        <Text
          accessibilityRole="alert"
          style={{ fontSize: 12, color: red[600], paddingHorizontal: 12 }}
        >
          {CHAT_NOTIFY_SAVE_FAILED}
        </Text>
      ) : null}
    </View>
  )
}
