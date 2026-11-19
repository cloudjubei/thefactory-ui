import Svg, { Path } from 'react-native-svg'

export function IconPointer({ size = 24, color }: { size?: number; color?: string }) {
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
      <Path d="M9 11V5a2 2 0 0 1 4 0v6" />
      <Path d="M13 9a2 2 0 0 1 4 0v3" />
      <Path d="M17 11a2 2 0 0 1 4 0v4a7 7 0 0 1-7 7h-1a7 7 0 0 1-6-3.4L4 14a2 2 0 0 1 3.4-2L9 14" />
    </Svg>
  )
}
