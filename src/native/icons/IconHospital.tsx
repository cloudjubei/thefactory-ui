import Svg, { Rect, Path } from 'react-native-svg'

export function IconHospital({ size = 24, color }: { size?: number; color?: string }) {
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
      <Rect x="5" y="4" width="14" height="16" rx="2" stroke="#6366F1" strokeWidth="2" />
      <Path d="M12 7v6" stroke="#10B981" strokeWidth="2" />
      <Path d="M9 10h6" stroke="#10B981" strokeWidth="2" />
      <Path d="M8 20v-3h8v3" stroke="#3B82F6" strokeWidth="2" />
    </Svg>
  )
}
