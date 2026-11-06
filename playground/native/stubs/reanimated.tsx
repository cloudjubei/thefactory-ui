import { Text, View } from 'react-native'

const same = <T,>(value: T): T => value

/** Animation stands still: a harness capture shows where a panel rests. */
export const useSharedValue = <T,>(value: T) => ({ value })
export const useAnimatedStyle = <T,>(style: () => T): T => style()
export const withTiming = same
export const withSpring = same
export const withRepeat = same
export const withSequence = same
export const runOnJS = same
export const Easing = new Proxy({}, { get: () => same })

const Animated = { View, Text, createAnimatedComponent: same }

export default Animated
