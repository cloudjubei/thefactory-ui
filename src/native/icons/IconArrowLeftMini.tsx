import Svg, { Polyline } from 'react-native-svg'

export function IconArrowLeftMini({ size = 24, color }: { size?: number; color?: string }) {
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
      <Polyline points="14 18 8 12 14 6" stroke="#6366F1" strokeWidth="2" />
    </Svg>
  )
}
