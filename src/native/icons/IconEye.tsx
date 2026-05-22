import Svg, { Path, Circle } from 'react-native-svg'

export function IconEye({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <Circle cx="12" cy="12" r="3" />
    </Svg>
  )
}
