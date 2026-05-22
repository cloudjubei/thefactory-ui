import Svg, { Rect, Circle } from 'react-native-svg'

export function IconBandage({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Rect
        x="4"
        y="8"
        width="16"
        height="6"
        rx="3"
        transform="rotate(45 12 11)"
        stroke="#F59E0B"
        strokeWidth="2"
      />
      <Circle
        cx="10"
        cy="10"
        r="0.8"
        transform="rotate(45 10 10)"
        stroke="#3B82F6"
        strokeWidth="2"
      />
      <Circle
        cx="12"
        cy="12"
        r="0.8"
        transform="rotate(45 12 12)"
        stroke="#3B82F6"
        strokeWidth="2"
      />
      <Circle
        cx="14"
        cy="14"
        r="0.8"
        transform="rotate(45 14 14)"
        stroke="#3B82F6"
        strokeWidth="2"
      />
    </Svg>
  )
}
