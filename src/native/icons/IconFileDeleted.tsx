import Svg, { Circle, Path } from 'react-native-svg'

export function IconFileDeleted({ size = 24, color }: { size?: number; color?: string }) {
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
      <Circle cx="12" cy="12" r="9" stroke="#EF4444" strokeWidth="2" />
      <Path d="M8 12h8" stroke="#EF4444" strokeWidth="2" />
    </Svg>
  )
}
