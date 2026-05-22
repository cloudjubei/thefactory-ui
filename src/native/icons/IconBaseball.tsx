import Svg, { Circle, Path } from 'react-native-svg'

export function IconBaseball({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="8" stroke="#6366F1" strokeWidth="2" />
      <Path d="M8 6c-2 2-2 10 0 12" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M16 6c2 2 2 10 0 12" stroke="#06B6D4" strokeWidth="2" />
      <Path d="M7.5 9.5l1 1" stroke="#10B981" strokeWidth="2" />
      <Path d="M7.5 13.5l1 1" stroke="#10B981" strokeWidth="2" />
      <Path d="M15.5 9.5l1 1" stroke="#22D3EE" strokeWidth="2" />
      <Path d="M15.5 13.5l1 1" stroke="#22D3EE" strokeWidth="2" />
    </Svg>
  )
}
