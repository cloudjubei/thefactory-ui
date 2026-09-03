import Svg, { Rect } from 'react-native-svg'

export function IconPause({
  size = 24,
  color = 'currentColor',
}: {
  size?: number
  color?: string
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Rect x="6" y="5" width="4" height="14" stroke={color} strokeWidth="2" />
      <Rect x="14" y="5" width="4" height="14" stroke={color} strokeWidth="2" />
    </Svg>
  )
}
