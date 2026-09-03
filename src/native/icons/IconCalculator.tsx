import Svg, { Rect, Path } from 'react-native-svg'

export function IconCalculator({ size = 24, color }: { size?: number; color?: string }) {
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
      <Rect x="5" y="3" width="14" height="18" rx="2" stroke="#3B82F6" strokeWidth="2" />
      <Rect x="8" y="7" width="8" height="3" rx="1" stroke="#A855F7" strokeWidth="2" />
      <Path d="M8 13h2M12 13h2M16 13h0M8 16h2M12 16h2M16 16h0" stroke="#10B981" strokeWidth="2" />
    </Svg>
  )
}
