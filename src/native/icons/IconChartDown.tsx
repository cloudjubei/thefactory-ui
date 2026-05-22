import Svg, { Path, Polyline } from 'react-native-svg'

export function IconChartDown({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 19V5" stroke="#94A3B8" strokeWidth="2" />
      <Path d="M4 19h16" stroke="#94A3B8" strokeWidth="2" />
      <Polyline points="6 9 11 14 14 11 20 17" stroke="#EF4444" strokeWidth="2" />
    </Svg>
  )
}
