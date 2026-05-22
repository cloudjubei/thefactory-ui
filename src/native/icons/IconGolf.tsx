import Svg, { Path, Circle } from 'react-native-svg'

export function IconGolf({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 4v10" stroke="#6366F1" strokeWidth="2" />
      <Path d="M6 4l6 3-6 2" stroke="#3B82F6" strokeWidth="2" />
      <Circle cx="14" cy="16" r="1" stroke="#10B981" strokeWidth="2" />
      <Path d="M4 18c4 2 12 2 16 0" stroke="#06B6D4" strokeWidth="2" />
    </Svg>
  )
}
