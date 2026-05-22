import Svg, { Rect, Path } from 'react-native-svg'

export function IconCalendar({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="4" width="18" height="17" rx="2" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M7 2v4M17 2v4" stroke="#A855F7" strokeWidth="2" />
      <Path d="M3 9h18" stroke="#10B981" strokeWidth="2" />
      <Path
        d="M7 12h0M11 12h0M15 12h0M19 12h0M7 16h0M11 16h0M15 16h0M19 16h0"
        stroke="#F59E0B"
        strokeWidth="2"
      />
    </Svg>
  )
}
