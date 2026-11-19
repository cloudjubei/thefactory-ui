import Svg, { Path } from 'react-native-svg'

export function IconFlag({ size = 24, color }: { size?: number; color?: string }) {
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
      <Path d="M4 22V4" />
      <Path d="M4 4h12l-2 4 2 4H4" />
    </Svg>
  )
}
