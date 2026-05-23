import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Animated,
  type LayoutChangeEvent,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import { nativeLightTheme, nativeMotion, nativeRadii, nativeSpace } from '../../tokens/native'
import { OverlayPortal } from './Overlay'

export interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  /** Sheet header — usually a short title. */
  title?: string
  children: ReactNode
  /** Optional footer slot (typically action buttons). */
  footer?: ReactNode
  /** Cap the sheet's height as a fraction of the screen. Default `0.85`. */
  maxHeightFraction?: number
  /**
   * When `true`, the sheet panel pins to `maxHeightFraction × screen` (so it
   * fills the available space) instead of hugging its content. Use for
   * surfaces that need an internal flex layout — e.g. a full-screen chat
   * hosted in the sheet.
   */
  fillHeight?: boolean
}

// A downward drag past this distance — or a fast downward fling — dismisses.
const DISMISS_DRAG_PX = 110
const DISMISS_VELOCITY = 0.6

/**
 * Slide-from-bottom sheet. Mobile-only — web uses dropdowns / popovers in the
 * same role. Renders through the app overlay host so it can open from inside
 * any other overlay. Dismisses on backdrop tap or by dragging the handle down.
 * The sheet hugs its content; it only scrolls internally when the content
 * would exceed `maxHeightFraction` of the screen.
 */
export default function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxHeightFraction = 0.85,
  fillHeight = false,
}: BottomSheetProps) {
  const { height: screenHeight } = useWindowDimensions()
  const translateY = useRef(new Animated.Value(screenHeight)).current
  // Two-step mount so the close animation is visible.
  const [rendered, setRendered] = useState(isOpen)
  const [headerH, setHeaderH] = useState(0)
  const [footerH, setFooterH] = useState(0)
  const [contentH, setContentH] = useState(0)

  // The pan responder is created once; route it to the freshest `onClose`.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (isOpen) setRendered(true)
  }, [isOpen])

  useEffect(() => {
    if (!rendered) return
    Animated.timing(translateY, {
      toValue: isOpen ? 0 : screenHeight,
      duration: isOpen ? nativeMotion.normal : nativeMotion.fast,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !isOpen) setRendered(false)
    })
  }, [isOpen, rendered, translateY, screenHeight])

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => g.dy > 4 && g.dy > Math.abs(g.dx),
      onPanResponderMove: (_e, g) => {
        translateY.setValue(Math.max(0, g.dy))
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dy > DISMISS_DRAG_PX || g.vy > DISMISS_VELOCITY) {
          onCloseRef.current()
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start()
        }
      },
    }),
  ).current

  if (!rendered) return null

  const backdropOpacity = translateY.interpolate({
    inputRange: [0, screenHeight],
    outputRange: [0.45, 0],
    extrapolate: 'clamp',
  })

  const maxPanelH = Math.round(maxHeightFraction * screenHeight)
  // Comfortably clears the iOS home indicator (~34pt) on devices that have
  // one; on devices without one, just looks like generous bottom breathing
  // room. Pre-Nitro `react-native-safe-area-context` isn't a dep of this
  // package, so we use a fixed conservative value rather than reading the
  // actual inset.
  const bottomSpacer = nativeSpace[16]
  const availForContent = maxPanelH - headerH - footerH - bottomSpacer
  const scroll = contentH > availForContent && availForContent > 0

  const content = fillHeight ? (
    // When pinning to a fixed height, the consumer manages its own scrolling
    // / flex layout — pass children through as a flex-1 container without
    // sheet padding (chat & similar surfaces own the inset).
    <View style={{ flex: 1 }}>{children}</View>
  ) : (
    <View
      onLayout={(e: LayoutChangeEvent) => setContentH(e.nativeEvent.layout.height)}
      style={{ paddingHorizontal: nativeSpace[5], paddingTop: nativeSpace[2] }}
    >
      {children}
    </View>
  )

  return (
    <OverlayPortal>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: backdropOpacity }]}
        />
        <Pressable
          accessibilityLabel="Dismiss sheet"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          style={{
            backgroundColor: nativeLightTheme.surface.overlay,
            borderTopLeftRadius: nativeRadii[5],
            borderTopRightRadius: nativeRadii[5],
            overflow: 'hidden',
            ...(fillHeight ? { height: maxPanelH } : { maxHeight: maxPanelH }),
            transform: [{ translateY }],
          }}
        >
          <View
            {...panResponder.panHandlers}
            onLayout={(e: LayoutChangeEvent) => setHeaderH(e.nativeEvent.layout.height)}
          >
            <View
              style={{
                alignItems: 'center',
                paddingTop: nativeSpace[4],
                paddingBottom: nativeSpace[3],
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: nativeLightTheme.border.default,
                }}
              />
            </View>
            {title ? (
              <View
                style={{
                  paddingHorizontal: nativeSpace[5],
                  paddingTop: nativeSpace[3],
                  paddingBottom: nativeSpace[2],
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 16, fontWeight: '600', color: nativeLightTheme.text.primary }}
                >
                  {title}
                </Text>
              </View>
            ) : null}
          </View>

          {fillHeight ? (
            content
          ) : scroll ? (
            <ScrollView
              style={{ height: availForContent }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {content}
            </ScrollView>
          ) : (
            content
          )}

          {footer ? (
            <View
              onLayout={(e: LayoutChangeEvent) => setFooterH(e.nativeEvent.layout.height)}
              style={{
                paddingHorizontal: nativeSpace[5],
                paddingTop: nativeSpace[3],
                borderTopWidth: 1,
                borderTopColor: nativeLightTheme.border.subtle,
              }}
            >
              {footer}
            </View>
          ) : null}
          {!fillHeight && <View style={{ height: bottomSpacer }} />}
        </Animated.View>
      </View>
    </OverlayPortal>
  )
}
