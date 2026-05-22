import Svg, { Circle, Path } from 'react-native-svg'

export function IconTennis({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="8" stroke="#6366F1" strokeWidth="2" />
      <Path d="M7 7c2 1.5 2 8.5 0 10" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M17 7c-2 1.5-2 8.5 0 10" stroke="#06B6D4" strokeWidth="2" />
    </Svg>
  )
}
