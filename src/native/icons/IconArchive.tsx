import Svg, { Rect, Path } from 'react-native-svg'

export function IconArchive({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="3" width="18" height="4" rx="1" stroke="#A855F7" strokeWidth="2" />
      <Rect x="5" y="7" width="14" height="14" rx="2" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M9 12h6" stroke="#10B981" strokeWidth="2" />
    </Svg>
  )
}
