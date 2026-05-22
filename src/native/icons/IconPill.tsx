import Svg, { Rect, Path } from 'react-native-svg'

export function IconPill({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Rect
        x="4"
        y="8"
        width="8"
        height="12"
        rx="4"
        transform="rotate(-45 4 8)"
        stroke="#EF4444"
        strokeWidth="2"
      />
      <Rect
        x="12"
        y="0"
        width="8"
        height="12"
        rx="4"
        transform="rotate(45 12 0)"
        stroke="#10B981"
        strokeWidth="2"
      />
      <Path d="M8 12l4 4" stroke="#F59E0B" strokeWidth="2" />
    </Svg>
  )
}
