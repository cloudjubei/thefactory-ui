import Svg, { Path } from 'react-native-svg'

export function IconBellOff({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? 'currentColor'}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M6 16v-5a6 6 0 0 1 9.5-4.9M18 11v5l1.5 2H8" />
      <Path d="M10 21h4M4 4l16 16" />
    </Svg>
  )
}
