import Svg, { Line } from 'react-native-svg'

export function IconMenu({ size = 24, color }: { size?: number; color?: string }) {
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
      <Line x1="3" y1="6" x2="21" y2="6" stroke="#3B82F6" strokeWidth="2" />
      <Line x1="3" y1="12" x2="21" y2="12" stroke="#A855F7" strokeWidth="2" />
      <Line x1="3" y1="18" x2="21" y2="18" stroke="#10B981" strokeWidth="2" />
    </Svg>
  )
}
