import Svg, { Rect, Path } from 'react-native-svg'

export function IconBriefcase({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="7" width="18" height="12" rx="2" stroke="#0EA5E9" strokeWidth="2" />
      <Path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" stroke="#A855F7" strokeWidth="2" />
      <Path d="M3 12h18" stroke="#10B981" strokeWidth="2" />
    </Svg>
  )
}
