import Svg, { Circle, Line } from 'react-native-svg'

export function IconZoomOut({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="11" cy="11" r="7" />
      <Line x1="21" y1="21" x2="16.65" y2="16.65" />
      <Line x1="8" y1="11" x2="14" y2="11" />
    </Svg>
  )
}
