import { useState } from 'react'
import { ActivityIndicator, Image, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export interface ImageViewerProps {
  /** Raw-bytes URL for the image. */
  uri: string
  /** Auth / other headers forwarded to the image request. */
  headers?: Record<string, string>
}

const MIN_SCALE = 1
const MAX_SCALE = 6

/**
 * Native image previewer with pinch-to-zoom + pan, mirroring web's
 * `ImageViewer` feel. Built on `react-native-gesture-handler`'s
 * `GestureDetector` with a `Pinch` and `Pan` composed via `Gesture.Simultaneous`
 * so the user can scale and drag at once. No control buttons — gestures only.
 *
 * Requires a `GestureHandlerRootView` at the app root (set in the mobile app's
 * `_layout.tsx`).
 */
export default function ImageViewer({ uri, headers }: ImageViewerProps) {
  const { theme } = useNativeTheme()
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')

  const scale = useSharedValue(1)
  const startScale = useSharedValue(1)
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const startTranslateX = useSharedValue(0)
  const startTranslateY = useSharedValue(0)

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value
    })
    .onUpdate((e) => {
      const next = startScale.value * e.scale
      scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next))
    })
    .onEnd(() => {
      if (scale.value <= MIN_SCALE + 0.01) {
        scale.value = withTiming(1)
        translateX.value = withTiming(0)
        translateY.value = withTiming(0)
      }
    })

  const pan = Gesture.Pan()
    .minPointers(1)
    .onStart(() => {
      startTranslateX.value = translateX.value
      startTranslateY.value = translateY.value
    })
    .onUpdate((e) => {
      // Only pan when zoomed in — at 1x it's not meaningful and conflicts
      // with the surrounding scroll surfaces.
      if (scale.value <= 1) return
      translateX.value = startTranslateX.value + e.translationX
      translateY.value = startTranslateY.value + e.translationY
    })

  const composed = Gesture.Simultaneous(pinch, pan)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }))

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: nativeSpace[4],
        backgroundColor: theme.surface.muted,
        overflow: 'hidden',
      }}
    >
      {state === 'loading' ? <ActivityIndicator /> : null}
      {state === 'error' ? (
        <Text style={{ fontSize: 13, color: theme.text.muted }}>
          Could not load image.
        </Text>
      ) : null}
      <GestureDetector gesture={composed}>
        <Animated.View
          style={[
            {
              width: '100%',
              height: '100%',
              opacity: state === 'ready' ? 1 : 0,
              position: state === 'ready' ? 'relative' : 'absolute',
            },
            animatedStyle,
          ]}
        >
          <Image
            source={{ uri, headers }}
            resizeMode="contain"
            onLoad={() => setState('ready')}
            onError={() => setState('error')}
            style={{ width: '100%', height: '100%' }}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  )
}
