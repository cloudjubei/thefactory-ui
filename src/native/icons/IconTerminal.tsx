import Svg, { Rect, Path } from 'react-native-svg'

export function IconTerminal({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="4" width="18" height="16" rx="2" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M6 8l3 3-3 3" stroke="#A855F7" strokeWidth="2" />
      <Path d="M11 14h7" stroke="#10B981" strokeWidth="2" />
    </Svg>
  )
}
