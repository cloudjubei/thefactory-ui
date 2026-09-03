import Svg, { Path, Rect } from 'react-native-svg'

export function IconSyringe({ size = 24, color }: { size?: number; color?: string }) {
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
      <Path d="M3 7l4 4" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M7 3l4 4" stroke="#60A5FA" strokeWidth="2" />
      <Rect
        x="9"
        y="7"
        width="8"
        height="4"
        rx="1"
        transform="rotate(45 9 7)"
        stroke="#6366F1"
        strokeWidth="2"
      />
      <Path d="M14.5 12.5l3 3" stroke="#06B6D4" strokeWidth="2" />
      <Path d="M17 15l3 3" stroke="#22D3EE" strokeWidth="2" />
      <Path d="M19 17l2 2" stroke="#10B981" strokeWidth="2" />
    </Svg>
  )
}
