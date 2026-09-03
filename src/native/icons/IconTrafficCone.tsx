import Svg, { Path } from 'react-native-svg'

export function IconTrafficCone({ size = 24, color }: { size?: number; color?: string }) {
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
      <Path d="M4 20h16" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M7 17h10" stroke="#A855F7" strokeWidth="2" />
      <Path d="M9 17l3-10 3 10" stroke="#F59E0B" strokeWidth="2" />
      <Path d="M10 13h4" stroke="#EF4444" strokeWidth="2" />
    </Svg>
  )
}
