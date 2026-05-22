import Svg, { Ellipse, Path } from 'react-native-svg'

export function IconCoins({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Ellipse cx="8" cy="8" rx="5" ry="3" stroke="#F59E0B" strokeWidth="2" />
      <Path d="M3 8v5c0 1.7 2.2 3 5 3s5-1.3 5-3V8" stroke="#F59E0B" strokeWidth="2" />
      <Ellipse cx="15.5" cy="14" rx="4.5" ry="2.5" stroke="#10B981" strokeWidth="2" />
    </Svg>
  )
}
