import Svg, { Rect, Path } from 'react-native-svg'

export function IconClamp({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="5" y="2" width="14" height="4" rx="1" stroke="#A855F7" strokeWidth="2" />
      <Path d="M7 6v6a3 3 0 0 0 3 3h4v4H9" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M17 10H10" stroke="#10B981" strokeWidth="2" />
    </Svg>
  )
}
