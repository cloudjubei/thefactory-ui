import Svg, { Line, Circle } from 'react-native-svg'

export function IconTimeline({ size = 24, color }: { size?: number; color?: string }) {
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
      <Line x1="12" y1="3" x2="12" y2="21" stroke="#6366F1" strokeWidth="2" />
      <Circle cx="12" cy="6" r="2" stroke="#F59E0B" strokeWidth="2" />
      <Circle cx="12" cy="12" r="2" stroke="#3B82F6" strokeWidth="2" />
      <Circle cx="12" cy="18" r="2" stroke="#10B981" strokeWidth="2" />
    </Svg>
  )
}
