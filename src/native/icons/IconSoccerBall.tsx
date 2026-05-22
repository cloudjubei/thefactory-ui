import Svg, { Circle, Polygon, Path } from 'react-native-svg'

export function IconSoccerBall({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="8" stroke="#3B82F6" strokeWidth="2" />
      <Polygon points="12,8 9,10 10,13 14,13 15,10" stroke="#6366F1" strokeWidth="2" fill="none" />
      <Path d="M9 10L6.5 8.5" stroke="#06B6D4" strokeWidth="2" />
      <Path d="M15 10L17.5 8.5" stroke="#06B6D4" strokeWidth="2" />
      <Path d="M10 13l-1.5 3" stroke="#10B981" strokeWidth="2" />
      <Path d="M14 13l1.5 3" stroke="#10B981" strokeWidth="2" />
    </Svg>
  )
}
