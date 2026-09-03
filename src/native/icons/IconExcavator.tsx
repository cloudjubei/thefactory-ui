import Svg, { Path, Circle } from 'react-native-svg'

export function IconExcavator({ size = 24, color }: { size?: number; color?: string }) {
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
      <Circle cx="14" cy="18" r="2" stroke="#EF4444" strokeWidth="2" />
      <Path d="M6 16h10l2-3" stroke="#10B981" strokeWidth="2" />
      <Path d="M9 12h4v4H9z" stroke="#A855F7" strokeWidth="2" />
      <Path d="M15 11l4-3" stroke="#F59E0B" strokeWidth="2" />
      <Path d="M19 8l2 3-2 1" stroke="#F59E0B" strokeWidth="2" />
    </Svg>
  )
}
