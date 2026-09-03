import Svg, { Path, Circle } from 'react-native-svg'

export function IconWheelbarrow({ size = 24, color }: { size?: number; color?: string }) {
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
      <Path d="M3 20h18" stroke="#3B82F6" strokeWidth="2" />
      <Circle cx="8" cy="18" r="2" stroke="#EF4444" strokeWidth="2" />
      <Path d="M5 15h8l3-5H8z" stroke="#F59E0B" strokeWidth="2" />
      <Path d="M16 10l5-2" stroke="#A855F7" strokeWidth="2" />
      <Path d="M9 15l-1 3" stroke="#10B981" strokeWidth="2" />
    </Svg>
  )
}
