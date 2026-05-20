import { type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'

import BottomSheet from '../../primitives/BottomSheet'
import { nativeLightTheme, nativeRadii, nativeSpace } from '../../../tokens/native'

export interface ChatSettingsAction {
  key: string
  label: string
  /** Optional one-line description shown beneath the label. */
  description?: string
  /** Tap handler. The host typically closes the sheet first then fires the
   *  next surface (open prompt editor, open costs modal, etc.). */
  onPress: () => void
  /** Optional emoji / glyph prefix. */
  glyph?: string
  /** Variant for destructive actions. */
  destructive?: boolean
  disabled?: boolean
}

export interface ChatSettingsDropdownProps {
  isOpen: boolean
  onClose: () => void
  /** Built-in action rows. The host can also pass children for richer
   *  layouts (model picker, tool toggles). */
  actions?: ReadonlyArray<ChatSettingsAction>
  /** Optional content rendered above the action list (e.g. model picker). */
  topSlot?: ReactNode
  /** Optional content rendered below the action list (e.g. tool toggles). */
  bottomSlot?: ReactNode
  title?: string
}

/**
 * Native peer of [web's `ChatSettingsDropdown`](../../../web/compound/chat/ChatSettingsDropdown.tsx).
 * On RN the dropdown renders as a bottom sheet — the convention for chat
 * settings on mobile per the implementation plan.
 *
 * Actions render as tappable rows; richer chrome (model picker, prompt
 * draft editor, per-tool toggles) is composed via `topSlot` / `bottomSlot`
 * so the compound stays presentation-only — the host owns connected state.
 */
export default function ChatSettingsDropdown({
  isOpen,
  onClose,
  actions = [],
  topSlot,
  bottomSlot,
  title = 'Chat settings',
}: ChatSettingsDropdownProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
      <View style={{ gap: nativeSpace[2], paddingBottom: nativeSpace[3] }}>
        {topSlot}
        {actions.map((a) => (
          <Pressable
            key={a.key}
            accessibilityRole="button"
            onPress={a.disabled ? undefined : a.onPress}
            disabled={a.disabled}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: nativeSpace[3],
              paddingVertical: nativeSpace[3],
              paddingHorizontal: nativeSpace[3],
              borderRadius: nativeRadii[3],
              backgroundColor:
                pressed && !a.disabled ? nativeLightTheme.surface.hover : 'transparent',
              opacity: a.disabled ? 0.5 : 1,
            })}
          >
            {a.glyph ? (
              <Text style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{a.glyph}</Text>
            ) : null}
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 14,
                  color: a.destructive ? '#dc2626' : nativeLightTheme.text.primary,
                  fontWeight: '500',
                }}
                numberOfLines={1}
              >
                {a.label}
              </Text>
              {a.description ? (
                <Text
                  style={{
                    fontSize: 12,
                    color: nativeLightTheme.text.muted,
                    marginTop: 2,
                  }}
                  numberOfLines={2}
                >
                  {a.description}
                </Text>
              ) : null}
            </View>
            <Text style={{ color: nativeLightTheme.text.muted, fontSize: 16 }}>›</Text>
          </Pressable>
        ))}
        {bottomSlot}
      </View>
    </BottomSheet>
  )
}
