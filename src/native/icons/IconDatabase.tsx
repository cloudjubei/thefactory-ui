import Svg, { Ellipse, Path } from 'react-native-svg'

export function IconDatabase({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Ellipse cx="12" cy="5" rx="8" ry="3" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5" stroke="#93C5FD" strokeWidth="2" />
      <Path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" stroke="#22D3EE" strokeWidth="2" />
    </Svg>
  )
}
