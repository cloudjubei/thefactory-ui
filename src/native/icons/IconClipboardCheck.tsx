import Svg, { Rect, Path } from 'react-native-svg'

export function IconClipboardCheck({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="6" y="5" width="12" height="16" rx="2" stroke="#3B82F6" strokeWidth="2" />
      <Rect x="9" y="2" width="6" height="4" rx="1" stroke="#A855F7" strokeWidth="2" />
      <Path d="M9 13l2 2 4-4" stroke="#10B981" strokeWidth="2" />
    </Svg>
  )
}
