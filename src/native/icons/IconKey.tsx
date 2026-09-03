import Svg, { Circle, Path } from 'react-native-svg'

export function IconKey({ size = 24, color }: { size?: number; color?: string }) {
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
      <Circle cx="8" cy="10" r="3" stroke="#F59E0B" strokeWidth="2" />
      <Path d="M11 10h9" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M17 10v3" stroke="#A855F7" strokeWidth="2" />
      <Path d="M15 10v2" stroke="#22D3EE" strokeWidth="2" />
    </Svg>
  )
}
