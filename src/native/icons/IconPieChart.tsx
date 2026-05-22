import Svg, { Circle, Path } from 'react-native-svg'

export function IconPieChart({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="9" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M12 3v9l7 7" stroke="#10B981" strokeWidth="2" />
    </Svg>
  )
}
