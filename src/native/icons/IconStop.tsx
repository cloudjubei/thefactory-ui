import Svg, { Circle, Rect } from 'react-native-svg'

export function IconStop({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      color={color}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Circle cx="12" cy="12" r="10" />
      <Rect x="9" y="9" width="6" height="6" />
    </Svg>
  )
}
