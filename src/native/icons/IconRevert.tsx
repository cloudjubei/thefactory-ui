import Svg, { Path } from 'react-native-svg'

export function IconRevert({ size = 24, color }: { size?: number; color?: string }) {
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
      <Path d="M9 14L4 9l5-5" stroke="currentColor" strokeWidth="2" />
      <Path
        d="M4 9h10.5a5.5 5.5 0 015.5 5.5v0a5.5 5.5 0 01-5.5 5.5H11"
        stroke="currentColor"
        strokeWidth="2"
      />
    </Svg>
  )
}
