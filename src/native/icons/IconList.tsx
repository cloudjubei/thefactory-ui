import Svg, { Line, Circle } from 'react-native-svg'

export function IconList({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Line x1="8" y1="6" x2="20" y2="6" stroke="#60A5FA" strokeWidth="2" />
      <Line x1="8" y1="12" x2="20" y2="12" stroke="#A855F7" strokeWidth="2" />
      <Line x1="8" y1="18" x2="20" y2="18" stroke="#10B981" strokeWidth="2" />
      <Circle cx="4" cy="6" r="1.5" fill="#F59E0B" />
      <Circle cx="4" cy="12" r="1.5" fill="#EF4444" />
      <Circle cx="4" cy="18" r="1.5" fill="#22D3EE" />
    </Svg>
  )
}
