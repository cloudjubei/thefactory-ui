import Svg, { Rect } from 'react-native-svg'

export function IconBricks({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="7" width="6" height="4" stroke="#F59E0B" strokeWidth="2" />
      <Rect x="9" y="7" width="6" height="4" stroke="#FB923C" strokeWidth="2" />
      <Rect x="15" y="7" width="6" height="4" stroke="#EF4444" strokeWidth="2" />
      <Rect x="6" y="13" width="6" height="4" stroke="#A855F7" strokeWidth="2" />
      <Rect x="12" y="13" width="6" height="4" stroke="#3B82F6" strokeWidth="2" />
    </Svg>
  )
}
