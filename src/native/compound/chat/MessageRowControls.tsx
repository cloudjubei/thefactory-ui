import { useState, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import { IconDelete, IconRefreshChat } from '../../icons'
import type { MessageDeleteControl } from '../../../headless/utils/chatMessageDeleteTypes'
import type { MessageRestartControl } from '../../../headless/utils/chatMessageRestartTypes'
import { MESSAGE_RESTART_ACTION_LABEL } from '../../../headless/utils/chatMessageRestartConstants'
import { nativeAlpha, nativePalette, nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

/** What the delete control on the chat's last row needs from the list. */
export type MessageDeleteBinding = {
  control: MessageDeleteControl
  onDelete: () => void
  /** True while the delete control is held and the row is one of the doomed. */
  preview: boolean
  onPreviewChange?: ((active: boolean) => void) | undefined
  /** A delete is still landing — the control refuses a second press. */
  deleting: boolean
}

/** What the restart control on the chat's last row needs from the list. */
export type MessageRestartBinding = {
  control: MessageRestartControl
  onRestart: () => void
}

/** The delete control on the chat's last row — native peer of web's `MessageDeleteButton`. */
export function MessageDeleteButton({ binding }: { binding: MessageDeleteBinding }) {
  const { theme } = useNativeTheme()
  const { control, onDelete, onPreviewChange, deleting } = binding
  const [confirming, setConfirming] = useState(false)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={confirming ? 'Tap again to delete — cannot be undone' : control.label}
      onPress={() => {
        // Two deliberate acts: the first press arms, the second commits.
        if (!confirming) {
          setConfirming(true)
          return
        }
        setConfirming(false)
        onPreviewChange?.(false)
        onDelete()
      }}
      onPressIn={() => onPreviewChange?.(true)}
      onPressOut={() => onPreviewChange?.(confirming)}
      // Blocked while a delete lands: the rows are gone locally but the
      // server has not agreed yet.
      disabled={control.disabled || deleting}
      hitSlop={4}
      style={({ pressed }) => ({
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: nativeRadii[1],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: pressed ? theme.surface.muted : theme.surface.raised,
        // A locked row is not merely unavailable — keep it legible, since
        // "this history is deliberately kept" is the message it carries.
        opacity: control.locked ? 0.85 : control.disabled ? 0.4 : 1,
      })}
    >
      {control.locked ? (
        <Text style={{ fontSize: 11 }}>🔒</Text>
      ) : (
        <IconDelete size={12} color={theme.text.secondary} />
      )}
    </Pressable>
  )
}

/** The control that runs the agent again on the chat's last turn. */
export function RestartTurnButton({
  binding,
  alignEnd = false,
  spaced = true,
}: {
  binding: MessageRestartBinding
  alignEnd?: boolean
  /** Space it from what it sits under; off in a row of controls. */
  spaced?: boolean
}) {
  const { theme } = useNativeTheme()
  const { control, onRestart } = binding
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={control.label}
      onPress={onRestart}
      disabled={control.disabled}
      hitSlop={4}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: nativeSpace[2],
        alignSelf: alignEnd ? 'flex-end' : 'flex-start',
        ...(spaced ? { marginTop: nativeSpace[2] } : {}),
        height: 24,
        paddingHorizontal: nativeSpace[4],
        borderRadius: nativeRadii[1],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: pressed ? theme.surface.muted : theme.surface.raised,
        opacity: control.disabled ? 0.4 : 1,
      })}
    >
      <IconRefreshChat size={12} color={theme.text.secondary} />
      <Text style={{ fontSize: 11, color: theme.text.secondary }}>
        {MESSAGE_RESTART_ACTION_LABEL}
      </Text>
    </Pressable>
  )
}

/**
 * A chat row drawn as a card of its own — native peer of web's `CardRowFrame`:
 * the controls the conversation's last message carries sit under the card, so
 * whatever kind of row ends the chat, it can be deleted, and run again where it
 * is the agent's input. The held delete tints the card only, never the controls.
 */
export function CardRowFrame({
  deleteBinding,
  restartBinding,
  children,
}: {
  deleteBinding?: MessageDeleteBinding | undefined
  restartBinding?: MessageRestartBinding | undefined
  children: ReactNode
}) {
  const preview = deleteBinding?.preview ?? false
  return (
    <View style={{ gap: nativeSpace[2] }}>
      <View
        style={
          preview
            ? {
                borderRadius: nativeRadii[2],
                backgroundColor: nativeAlpha(nativePalette.red[500], 0.1),
              }
            : undefined
        }
      >
        {children}
      </View>
      {deleteBinding || restartBinding ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[3] }}>
          {restartBinding ? <RestartTurnButton binding={restartBinding} spaced={false} /> : null}
          {deleteBinding ? <MessageDeleteButton binding={deleteBinding} /> : null}
        </View>
      ) : null}
    </View>
  )
}
