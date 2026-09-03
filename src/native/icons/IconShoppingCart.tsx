import Svg, { Rect, Path, Circle } from 'react-native-svg'

export function IconShoppingCart({ size = 24, color }: { size?: number; color?: string }) {
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
      <Rect x="5" y="7" width="13" height="9" rx="2" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M7 7l3-4M16 7l-3-4" stroke="#A855F7" strokeWidth="2" />
      <Circle cx="8" cy="19" r="2" stroke="#10B981" strokeWidth="2" />
      <Circle cx="17" cy="19" r="2" stroke="#F59E0B" strokeWidth="2" />
    </Svg>
  )
}
