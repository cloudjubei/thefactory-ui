import Svg, { Circle, Line } from 'react-native-svg'

export function IconSearch({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="11" cy="11" r="7" stroke="#3B82F6" strokeWidth="2" />
      <Line x1="21" y1="21" x2="16.65" y2="16.65" stroke="#A855F7" strokeWidth="2" />
    </Svg>
  )
}
