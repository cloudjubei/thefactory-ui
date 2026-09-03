import Svg, { Circle, Path } from 'react-native-svg'

export function IconUsers({ size = 24, color }: { size?: number; color?: string }) {
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
      <Circle cx="9" cy="8" r="3" stroke="#3B82F6" strokeWidth="2" />
      <Circle cx="16" cy="9" r="2.5" stroke="#A855F7" strokeWidth="2" />
      <Path d="M3.5 18a5.5 5.5 0 0 1 11 0" stroke="#10B981" strokeWidth="2" />
      <Path d="M11.5 17a4.5 4.5 0 0 1 8 2" stroke="#F59E0B" strokeWidth="2" />
    </Svg>
  )
}
