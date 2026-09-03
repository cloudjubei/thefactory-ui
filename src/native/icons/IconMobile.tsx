import Svg, { Rect, Circle } from 'react-native-svg'

export function IconMobile({ size = 24, color }: { size?: number; color?: string }) {
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
      <Rect x="7" y="2" width="10" height="20" rx="2" stroke="#3B82F6" strokeWidth="2" />
      <Circle cx="12" cy="18" r="1" fill="#10B981" stroke="#10B981" />
    </Svg>
  )
}
