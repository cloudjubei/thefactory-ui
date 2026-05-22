import Svg, { Path, Rect } from 'react-native-svg'

export function IconBarChart({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 20h18M3 4v16" stroke="#93C5FD" strokeWidth="2" />
      <Rect x="6" y="12" width="3" height="6" rx="1" stroke="#3B82F6" strokeWidth="2" />
      <Rect x="11" y="9" width="3" height="9" rx="1" stroke="#10B981" strokeWidth="2" />
      <Rect x="16" y="6" width="3" height="12" rx="1" stroke="#A855F7" strokeWidth="2" />
    </Svg>
  )
}
