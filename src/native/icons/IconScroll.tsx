import Svg, { Path, Polyline, Line } from 'react-native-svg'

export function IconScroll({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <Polyline points="14 2 14 8 20 8" />
      <Line x1="16" y1="13" x2="8" y2="13" />
      <Line x1="16" y1="17" x2="8" y2="17" />
      <Line x1="10" y1="9" x2="8" y2="9" />
    </Svg>
  )
}
