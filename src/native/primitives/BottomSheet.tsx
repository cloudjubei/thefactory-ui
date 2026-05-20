import { useEffect, useRef, type ReactNode } from 'react'
import { Animated, Modal as RNModal, Pressable, Text, View } from 'react-native'
import { nativeLightTheme, nativeRadii, nativeSpace } from '../../tokens/native'

export interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  /** Sheet header — usually a short title. */
  title?: string
  children: ReactNode
  /** Optional footer slot (typically action buttons). */
  footer?: ReactNode
  /** Cap the sheet's height as a fraction of the screen. Default `0.75`. */
  maxHeightFraction?: number
}

/**
 * Slide-from-bottom sheet built on top of RN's `Modal`. Mobile-only — web
 * uses dropdowns / popovers in the same role, but on a phone, native
 * dropdowns are awkward to anchor accurately so sheets are the convention
 * (consistent with iOS / Android system patterns).
 *
 * Backdrop tap dismisses; the sheet itself is a scrim-anchored card with
 * rounded top corners, optional title bar, and an optional footer slot
 * (typically action buttons).
 */
export default function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxHeightFraction = 0.75,
}: BottomSheetProps) {
  const slide = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(slide, {
      toValue: isOpen ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start()
  }, [isOpen, slide])

  return (
    <RNModal
      visible={isOpen}
      animationType="none"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        accessibilityLabel="Dismiss sheet"
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.45)',
          justifyContent: 'flex-end',
        }}
      >
        <Pressable accessibilityRole="none" onPress={() => undefined}>
          <Animated.View
            style={{
              backgroundColor: nativeLightTheme.surface.overlay,
              borderTopLeftRadius: nativeRadii[5],
              borderTopRightRadius: nativeRadii[5],
              maxHeight: `${Math.round(maxHeightFraction * 100)}%`,
              paddingBottom: nativeSpace[4],
              transform: [
                {
                  translateY: slide.interpolate({
                    inputRange: [0, 1],
                    outputRange: [400, 0],
                  }),
                },
              ],
            }}
          >
            <View style={{ alignItems: 'center', paddingTop: nativeSpace[2] }}>
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: nativeLightTheme.border.default,
                  opacity: 0.5,
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
                  style={{ fontSize: 16, fontWeight: '600', color: nativeLightTheme.text.primary }}
                  numberOfLines={1}
                >
                  {title}
                </Text>
              </View>
            ) : null}
            <View style={{ paddingHorizontal: nativeSpace[5], paddingTop: nativeSpace[2] }}>
              {children}
            </View>
            {footer ? (
              <View
                style={{
                  paddingHorizontal: nativeSpace[5],
                  paddingTop: nativeSpace[3],
                  borderTopWidth: 1,
                  borderTopColor: nativeLightTheme.border.subtle,
                  marginTop: nativeSpace[3],
                }}
              >
                {footer}
              </View>
            ) : null}
          </Animated.View>
        </Pressable>
      </Pressable>
    </RNModal>
  )
}
