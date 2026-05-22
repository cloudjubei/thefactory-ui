import Svg, { Rect, Path } from 'react-native-svg'

export function IconBlueprint({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="5" y="5" width="12" height="14" rx="2" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M17 15l2 2-2 2" stroke="#A855F7" strokeWidth="2" />
      <Path d="M8 8h6M8 11h6M8 14h6" stroke="#10B981" strokeWidth="2" />
      <Path d="M8 17h6" stroke="#F59E0B" strokeWidth="2" />
    </Svg>
  )
}
