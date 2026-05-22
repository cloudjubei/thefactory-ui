import Svg, { Line, Polygon } from 'react-native-svg'

export function IconSend({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Line x1="22" y1="2" x2="11" y2="13" stroke="#3B82F6" strokeWidth="2" />
      <Polygon points="22 2 15 22 11 13 2 9 22 2" stroke="#10B981" strokeWidth="2" />
    </Svg>
  )
}
