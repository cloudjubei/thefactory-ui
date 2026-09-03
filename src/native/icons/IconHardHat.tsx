import Svg, { Path } from 'react-native-svg'

export function IconHardHat({ size = 24, color }: { size?: number; color?: string }) {
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
      <Path d="M3 17h18" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M6 17a6 6 0 0 1 12 0" stroke="#F59E0B" strokeWidth="2" />
      <Path d="M12 11V7" stroke="#A855F7" strokeWidth="2" />
      <Path d="M9 12l-1-2" stroke="#10B981" strokeWidth="2" />
      <Path d="M15 12l1-2" stroke="#EF4444" strokeWidth="2" />
    </Svg>
  )
}
