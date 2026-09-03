import Svg, { Path, Polyline } from 'react-native-svg'

export function IconRefresh({ size = 24, color }: { size?: number; color?: string }) {
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
      <Path d="M21 12a9 9 0 1 1-3.3-6.9" stroke="#22C55E" strokeWidth="2" />
      <Polyline points="21 3 21 9 15 9" stroke="#EF4444" strokeWidth="2" />
    </Svg>
  )
}
