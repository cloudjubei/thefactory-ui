import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Animated, BackHandler, Easing, Pressable, StyleSheet, Text, View } from 'react-native'
import { nativeMotion, nativeRadii, nativeSpace } from '../../tokens/native'
import { useNativeTheme } from '../hooks/useNativeTheme'
import { OverlayPortal } from './Overlay'

export interface FullScreenOverlayProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  /** Header title. When omitted the header still renders its close button. */
  title?: string
  /** Controls rendered left of the close button. */
  headerActions?: ReactNode
  /** Drop the header entirely — `children` then own the whole surface. */
  hideHeader?: boolean
  /** No-op on RN — Android hardware back always dismisses; iOS has no Esc. */
  closeOnEsc?: boolean
  /** Safe-area insets supplied by the host (avoids a safe-area dependency here). */
  topInset?: number
  bottomInset?: number
}

/**
 * Edge-to-edge overlay — the native counterpart to the web `FullScreenOverlay`.
 * Rides the app overlay host (`OverlayPortal`) on an absolute-fill panel, so it
 * covers the whole app including the nav drawer and can open from inside another
 * overlay. Android hardware back dismisses it; safe-area insets come from the
 * host, matching `NavDrawer`.
 */
export default function FullScreenOverlay({
  isOpen,
  onClose,
  children,
  title,
  headerActions,
  hideHeader = false,
  topInset = 0,
  bottomInset = 0,
}: FullScreenOverlayProps) {
  const { theme } = useNativeTheme()
  // Two-step mount so the close animation is visible.
  const [rendered, setRendered] = useState(isOpen)
  const progress = useRef(new Animated.Value(isOpen ? 1 : 0)).current

  useEffect(() => {
    if (isOpen) setRendered(true)
  }, [isOpen])

  useEffect(() => {
    if (!rendered) return
    Animated.timing(progress, {
      toValue: isOpen ? 1 : 0,
      duration: isOpen ? nativeMotion.normal : nativeMotion.fast,
      easing: isOpen ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !isOpen) setRendered(false)
    })
  }, [isOpen, rendered, progress])

  useEffect(() => {
    if (!rendered) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!isOpen) return false
      onClose()
      return true
    })
    return () => sub.remove()
  }, [rendered, isOpen, onClose])

  if (!rendered) return null

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [24, 0] })

  return (
    <OverlayPortal>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: theme.surface.base,
            paddingTop: topInset,
            paddingBottom: bottomInset,
            opacity: progress,
            transform: [{ translateY }],
          },
        ]}
      >
        {!hideHeader && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: nativeSpace[4],
              paddingHorizontal: nativeSpace[5],
              paddingVertical: nativeSpace[4],
              borderBottomWidth: 1,
              borderBottomColor: theme.border.subtle,
              backgroundColor: theme.surface.raised,
            }}
          >
            {title ? (
              <Text
                accessibilityRole="header"
                numberOfLines={1}
                style={{ flex: 1, fontSize: 16, fontWeight: '600', color: theme.text.primary }}
              >
                {title}
              </Text>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[4] }}>
              {headerActions}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={onClose}
                style={({ pressed }) => ({
                  height: 32,
                  width: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: nativeRadii[2],
                  opacity: pressed ? 0.6 : 0.85,
                })}
              >
                <Text style={{ fontSize: 18, color: theme.text.secondary }}>×</Text>
              </Pressable>
            </View>
          </View>
        )}
        <View style={{ flex: 1 }}>{children}</View>
      </Animated.View>
    </OverlayPortal>
  )
}
