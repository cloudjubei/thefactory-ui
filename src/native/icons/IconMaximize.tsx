import Svg, { Polyline } from 'react-native-svg'

export function IconMaximize({
  size = 24,
  color,
  stroke = '#0EA5E9',
}: {
  size?: number
  color?: string
  stroke?: string
}) {
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
      <Polyline points="9 3 3 3 3 9" stroke={stroke} strokeWidth="2" />
      <Polyline points="15 3 21 3 21 9" stroke={stroke} strokeWidth="2" />
      <Polyline points="21 15 21 21 15 21" stroke={stroke} strokeWidth="2" />
      <Polyline points="9 21 3 21 3 15" stroke={stroke} strokeWidth="2" />
    </Svg>
  )
}
