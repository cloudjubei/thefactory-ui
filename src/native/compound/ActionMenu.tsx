import { Fragment, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import BottomSheet from '../primitives/BottomSheet'
import { nativeRadii, nativeSpace } from '../../tokens/native'
import { useNativeTheme } from '../hooks/useNativeTheme'

export interface ActionMenuItem {
  key: string
  label: string
  /** Optional one-line description shown beneath the label. */
  description?: string
  /** Optional leading icon node. */
  icon?: ReactNode
  /** The value it sits at, drawn muted at the row's end — `Everything ›`. */
  hint?: string
  /** A heading the row sits under; consecutive rows share it. */
  section?: string
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
  const { theme } = useNativeTheme()
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
      <View style={{ gap: nativeSpace[1], paddingBottom: nativeSpace[3] }}>
        {actions.map((a, i) => (
          <Fragment key={a.key}>
            {a.section && a.section !== actions[i - 1]?.section ? (
              <Text
                style={{
                  marginTop: i > 0 ? nativeSpace[2] : 0,
                  paddingTop: i > 0 ? nativeSpace[2] : 0,
                  paddingHorizontal: nativeSpace[3],
                  borderTopWidth: i > 0 ? 1 : 0,
                  borderTopColor: theme.border.subtle,
                  fontSize: 11,
                  fontWeight: '600',
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                  color: theme.text.muted,
                }}
              >
                {a.section}
              </Text>
            ) : null}
            <Pressable
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
                backgroundColor: pressed && !a.disabled ? theme.surface.hover : 'transparent',
                opacity: a.disabled ? 0.5 : 1,
              })}
            >
              {a.icon ? <View style={{ width: 24, alignItems: 'center' }}>{a.icon}</View> : null}
              <View style={{ flex: 1 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 15,
                    fontWeight: '500',
                    color: a.destructive ? '#dc2626' : theme.text.primary,
                  }}
                >
                  {a.label}
                </Text>
                {a.description ? (
                  <Text
                    numberOfLines={2}
                    style={{ marginTop: 2, fontSize: 12, color: theme.text.muted }}
                  >
                    {a.description}
                  </Text>
                ) : null}
              </View>
              {a.hint ? (
                <Text style={{ fontSize: 13, color: theme.text.secondary }}>{a.hint}</Text>
              ) : null}
            </Pressable>
          </Fragment>
        ))}
      </View>
    </BottomSheet>
  )
}
