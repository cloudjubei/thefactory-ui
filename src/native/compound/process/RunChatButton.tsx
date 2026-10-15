import { Pressable, View } from 'react-native'

import { RUN_CHAT_OPEN_LABEL } from '../../../headless'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconChat } from '../../icons'

export type RunChatButtonProps = {
  onOpen: () => void
  /** The run's chat has news for the person — a reply or an ask they have not seen. */
  unread: boolean
  /** Sized to a step screen head's smaller buttons. */
  compact?: boolean
}

/**
 * The run chat's button, on every screen of a run: the run head at any depth
 * and a step's screen. It pushes the one chat of the whole run tree. Native's
 * form of web's `RunChatButton`.
 */
export default function RunChatButton({ onOpen, unread, compact = false }: RunChatButtonProps) {
  const { theme } = useNativeTheme()
  const size = compact ? 30 : 32
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={RUN_CHAT_OPEN_LABEL}
      onPress={onOpen}
      hitSlop={6}
      style={({ pressed }) => ({
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: compact ? theme.border.subtle : theme.border.default,
        backgroundColor: pressed ? theme.surface.muted : theme.surface.raised,
      })}
    >
      <IconChat size={compact ? 14 : 16} color={theme.text.secondary} />
      {unread ? (
        <View
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: theme.accent.primary,
          }}
        />
      ) : null}
    </Pressable>
  )
}
