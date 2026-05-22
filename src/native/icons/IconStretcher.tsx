import Svg, { Path, Circle } from 'react-native-svg'

export function IconStretcher({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 10h14a2 2 0 0 1 2 2v2H3v-4z" stroke="#6366F1" strokeWidth="2" />
      <Path d="M5 18l4-4" stroke="#60A5FA" strokeWidth="2" />
      <Path d="M13 18l-4-4" stroke="#60A5FA" strokeWidth="2" />
      <Circle cx="6" cy="19" r="1.5" stroke="#10B981" strokeWidth="2" />
      <Circle cx="12" cy="19" r="1.5" stroke="#10B981" strokeWidth="2" />
    </Svg>
  )
}
