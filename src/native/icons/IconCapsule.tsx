import Svg, { Rect } from 'react-native-svg'

export function IconCapsule({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Rect
        x="5"
        y="5"
        width="8"
        height="14"
        rx="4"
        transform="rotate(-45 5 5)"
        stroke="#10B981"
        strokeWidth="2"
      />
      <Rect
        x="11"
        y="-1"
        width="8"
        height="14"
        rx="4"
        transform="rotate(45 11 -1)"
        stroke="#3B82F6"
        strokeWidth="2"
      />
    </Svg>
  )
}
