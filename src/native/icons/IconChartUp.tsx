import Svg, { Path, Polyline } from 'react-native-svg'

export function IconChartUp({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      color={color}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M4 19V5" stroke="#94A3B8" strokeWidth="2" />
      <Path d="M4 19h16" stroke="#94A3B8" strokeWidth="2" />
      <Polyline points="6 13 11 8 14 11 20 5" stroke="#10B981" strokeWidth="2" />
    </Svg>
  )
}
