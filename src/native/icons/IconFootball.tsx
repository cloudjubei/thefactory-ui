import Svg, { Path } from 'react-native-svg'

export function IconFootball({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 12c0-4 4-6 8-6s8 2 8 6-4 6-8 6-8-2-8-6z" stroke="#6366F1" strokeWidth="2" />
      <Path d="M8 12h8" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M11 10v4" stroke="#06B6D4" strokeWidth="2" />
      <Path d="M13 10v4" stroke="#06B6D4" strokeWidth="2" />
      <Path d="M6 10c1 1 1 3 0 4" stroke="#10B981" strokeWidth="2" />
      <Path d="M18 10c-1 1-1 3 0 4" stroke="#22D3EE" strokeWidth="2" />
    </Svg>
  )
}
