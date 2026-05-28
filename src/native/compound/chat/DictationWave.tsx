import { useEffect, useRef } from 'react'
import { Animated, View } from 'react-native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

/**
 * Native peer of the web DictationWave. Five vertical bars scale on a
 * staggered loop while dictation is active — no real audio analysis,
 * just a visual cue that the mic is live. Uses RN's `Animated` to
 * drive the scale so the animation runs on the UI thread.
 */
const DELAYS_MS = [0, 120, 240, 360, 480] as const

export default function DictationWave({ height = 22 }: { height?: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height,
        gap: 2,
      }}
    >
      {DELAYS_MS.map((delay) => (
        <WaveBar key={delay} delay={delay} height={height} />
      ))}
    </View>
  )
}

function WaveBar({ delay, height }: { delay: number; height: number }) {
  const { theme } = useNativeTheme()
  const scale = useRef(new Animated.Value(0.35)).current

  useEffect(() => {
    // JS-driven, not native-driven. The native driver is the obvious
    // choice for a fire-and-forget transform, but combining it with
    // the rapidly-re-measuring TextInput sitting beside us in the
    // composer produces two ugly artifacts in dev builds:
    //
    //   - `Sending onAnimatedValueUpdate with no listeners` warnings
    //     on unmount (the native side ticks a final frame after JS
    //     has torn the listener down).
    //   - intermittent `CoreGraphics: invalid numeric value (NaN)`
    //     errors as RN's layout engine reads stale dimensions while
    //     the transform is mid-flight.
    //
    // For 5 small bars (~3px wide), the JS thread can drive 60fps
    // without breaking a sweat — the perf cost is invisible and the
    // logs stay clean.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1,
          duration: 600,
          useNativeDriver: false,
          delay,
        }),
        Animated.timing(scale, {
          toValue: 0.35,
          duration: 600,
          useNativeDriver: false,
        }),
      ]),
    )
    loop.start()
    return () => {
      loop.stop()
      scale.removeAllListeners()
    }
  }, [scale, delay])

  return (
    <Animated.View
      style={{
        width: 3,
        height,
        borderRadius: 2,
        backgroundColor: theme.accent.primary,
        transform: [{ scaleY: scale }],
      }}
    />
  )
}
