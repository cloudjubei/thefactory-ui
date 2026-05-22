import Svg, { Path, Circle } from 'react-native-svg'

export function IconHockey({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 4l8 10" stroke="#6366F1" strokeWidth="2" />
      <Path d="M14 14h4" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M18 16h2" stroke="#06B6D4" strokeWidth="2" />
      <Circle cx="20" cy="16" r="1" stroke="#10B981" strokeWidth="2" />
    </Svg>
  )
}
