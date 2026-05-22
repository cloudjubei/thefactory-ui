import Svg, { Circle, Line } from 'react-native-svg'

export function IconInfo({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="10" />
      <Line x1="12" y1="11" x2="12" y2="17" />
      <Circle cx="12" cy="7.5" r="0.6" fill="currentColor" stroke="none" />
    </Svg>
  )
}
