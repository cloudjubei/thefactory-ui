import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import BottomSheet from '../primitives/BottomSheet'
import { nativeLightTheme, nativeRadii, nativeSpace } from '../../tokens/native'

export interface ActionMenuItem {
  key: string
  label: string
  /** Optional one-line description shown beneath the label. */
  description?: string
  /** Optional leading emoji / glyph. */
  glyph?: string
  /** Optional leading icon node — takes precedence over `glyph`. */
  icon?: ReactNode
  /** Renders the row in a destructive (red) treatment. */
  destructive?: boolean
  disabled?: boolean
  onPress: () => void
}

export interface ActionMenuProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  actions: ReadonlyArray<ActionMenuItem>
}

/**
 * Contextual action menu — the touch replacement for hover-revealed row
 * actions. Renders as a bottom sheet of tappable rows. The host typically
 * closes the menu inside each action's `onPress` before opening the next
 * surface (a modal, a confirm dialog, …).
 */
export default function ActionMenu({ isOpen, onClose, title, actions }: ActionMenuProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
      <View style={{ gap: nativeSpace[1], paddingBottom: nativeSpace[3] }}>
        {actions.map((a) => (
          <Pressable
            key={a.key}
            accessibilityRole="button"
            disabled={a.disabled}
            onPress={a.disabled ? undefined : a.onPress}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: nativeSpace[3],
              minHeight: 48,
              paddingVertical: nativeSpace[3],
              paddingHorizontal: nativeSpace[3],
              borderRadius: nativeRadii[3],
              backgroundColor:
                pressed && !a.disabled ? nativeLightTheme.surface.hover : 'transparent',
              opacity: a.disabled ? 0.5 : 1,
            })}
          >
            {a.icon ? (
              <View style={{ width: 24, alignItems: 'center' }}>{a.icon}</View>
            ) : a.glyph ? (
              <Text style={{ width: 24, textAlign: 'center', fontSize: 18 }}>{a.glyph}</Text>
            ) : null}
            <View style={{ flex: 1 }}>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 15,
                  fontWeight: '500',
                  color: a.destructive ? '#dc2626' : nativeLightTheme.text.primary,
                }}
              >
                {a.label}
              </Text>
              {a.description ? (
                <Text
                  numberOfLines={2}
                  style={{ marginTop: 2, fontSize: 12, color: nativeLightTheme.text.muted }}
                >
                  {a.description}
                </Text>
              ) : null}
            </View>
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  )
}
