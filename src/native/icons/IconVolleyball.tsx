import Svg, { Circle, Path } from 'react-native-svg'

export function IconVolleyball({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="8" stroke="#6366F1" strokeWidth="2" />
      <Path d="M6 9c3 0 6 2 6 5" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M18 15c-3 0-6-2-6-5" stroke="#06B6D4" strokeWidth="2" />
      <Path d="M12 4c0 4-2 6-6 6" stroke="#10B981" strokeWidth="2" />
      <Path d="M12 20c0-4 2-6 6-6" stroke="#22D3EE" strokeWidth="2" />
    </Svg>
  )
}
