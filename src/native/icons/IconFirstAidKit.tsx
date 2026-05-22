import Svg, { Rect, Path } from 'react-native-svg'

export function IconFirstAidKit({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="4" y="8" width="16" height="10" rx="2" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" stroke="#60A5FA" strokeWidth="2" />
      <Path d="M12 10v6" stroke="#10B981" strokeWidth="2" />
      <Path d="M9 13h6" stroke="#10B981" strokeWidth="2" />
    </Svg>
  )
}
