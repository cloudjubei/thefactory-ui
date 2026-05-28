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
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
          delay,
        }),
        Animated.timing(scale, {
          toValue: 0.35,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    )
    loop.start()
    return () => loop.stop()
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
