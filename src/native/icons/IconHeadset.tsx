import Svg, { Path, Rect } from 'react-native-svg'

export function IconHeadset({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 13a8 8 0 0 1 16 0" stroke="#3B82F6" strokeWidth="2" />
      <Rect x="3" y="12" width="4" height="6" rx="2" stroke="#A855F7" strokeWidth="2" />
      <Rect x="17" y="12" width="4" height="6" rx="2" stroke="#10B981" strokeWidth="2" />
      <Path d="M7 17c0 1.657 1.79 3 4 3h2" stroke="#F59E0B" strokeWidth="2" />
    </Svg>
  )
}
