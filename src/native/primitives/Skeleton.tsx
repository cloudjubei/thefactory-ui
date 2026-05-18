import { useEffect, useRef } from 'react'
import { Animated, View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import { nativeLightTheme, nativeRadii, nativeSpace } from '../../tokens/native'

export interface SkeletonProps {
  className?: string
  style?: StyleProp<ViewStyle>
}

/**
 * Solid muted block with a slow pulse animation. Mirrors the web peer's
 * `ui-skeleton` look — the animation runs natively (RN `Animated` with the
 * native driver) so it doesn't block the JS thread.
 */
export default function Skeleton({ className, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.6)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.6, duration: 800, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [opacity])

  return (
    <Animated.View
      className={className}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          backgroundColor: nativeLightTheme.surface.muted,
          borderRadius: nativeRadii[1],
          opacity,
        },
        style,
      ]}
    />
  )
}

export interface SkeletonTextProps {
  lines?: number
  className?: string
  lineStyle?: StyleProp<ViewStyle>
}

export function SkeletonText({ lines = 3, className, lineStyle }: SkeletonTextProps) {
  return (
    <View className={className} style={{ gap: nativeSpace[3] }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} style={[{ height: 12, borderRadius: nativeRadii[1] }, lineStyle]} />
      ))}
    </View>
  )
}
