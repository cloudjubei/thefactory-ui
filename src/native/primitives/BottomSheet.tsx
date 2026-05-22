import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Animated,
  Modal as RNModal,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import { nativeLightTheme, nativeMotion, nativeRadii, nativeSpace } from '../../tokens/native'

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
}

// A downward drag past this distance — or a fast downward fling — dismisses.
const DISMISS_DRAG_PX = 110
const DISMISS_VELOCITY = 0.6

/**
 * Slide-from-bottom sheet built on RN's `Modal`. Mobile-only — web uses
 * dropdowns / popovers in the same role. Dismisses on backdrop tap or by
 * dragging the handle down. It stays mounted through the close animation so it
 * slides out instead of vanishing, and clips its content to the rounded top
 * corners; tall content scrolls rather than overflowing.
 */
export default function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxHeightFraction = 0.85,
}: BottomSheetProps) {
  const { height: screenHeight } = useWindowDimensions()
  const translateY = useRef(new Animated.Value(screenHeight)).current
  // Two-step mount so the close animation is visible — an RNModal hidden by
  // `visible=false` would unmount in a single frame (a flash).
  const [rendered, setRendered] = useState(isOpen)

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

  return (
    <RNModal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#000',
            opacity: backdropOpacity,
          }}
        />
        <Pressable
          accessibilityLabel="Dismiss sheet"
          onPress={onClose}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <Animated.View
          style={{
            backgroundColor: nativeLightTheme.surface.overlay,
            borderTopLeftRadius: nativeRadii[5],
            borderTopRightRadius: nativeRadii[5],
            overflow: 'hidden',
            maxHeight: Math.round(maxHeightFraction * screenHeight),
            transform: [{ translateY }],
          }}
        >
          <View {...panResponder.panHandlers}>
            <View style={{ alignItems: 'center', paddingTop: nativeSpace[2] }}>
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
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
          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerStyle={{
              paddingHorizontal: nativeSpace[5],
              paddingTop: nativeSpace[2],
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
          {footer ? (
            <View
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
          <View style={{ height: nativeSpace[8] }} />
        </Animated.View>
      </View>
    </RNModal>
  )
}
