import Svg, { Path, Circle } from 'react-native-svg'

export function IconCementMixer({ size = 24, color }: { size?: number; color?: string }) {
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
      <Path d="M6 16h7l3-3" stroke="#10B981" strokeWidth="2" />
      <Circle cx="8" cy="18" r="2" stroke="#EF4444" strokeWidth="2" />
      <Path d="M14 8l3 3-3 3-3-3 3-3z" stroke="#F59E0B" strokeWidth="2" />
      <Path d="M17 11h3" stroke="#A855F7" strokeWidth="2" />
    </Svg>
  )
}
