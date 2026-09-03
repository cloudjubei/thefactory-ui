import Svg, { Path } from 'react-native-svg'

export function IconThumbDown({
  size = 24,
  color,
  filled = false,
}: {
  size?: number
  color?: string
  filled?: boolean
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
      <Path
        d="M10 15v4a3 3 0 0 0 3 3l1-5 4-5V4H9A3 3 0 0 0 6 7v6a2 2 0 0 0 2 2h2z"
        stroke="#EF4444"
        strokeWidth="2"
        fill={filled ? '#EF4444' : 'none'}
      />
      <Path d="M17 3h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" stroke="#3B82F6" strokeWidth="2" />
    </Svg>
  )
}
