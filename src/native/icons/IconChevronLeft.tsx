import Svg, { Polyline } from 'react-native-svg'

export function IconChevronLeft({ size = 24, color }: { size?: number; color?: string }) {
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
      <Polyline points="15 18 9 12 15 6" stroke="currentColor" strokeWidth="2" />
    </Svg>
  )
}
