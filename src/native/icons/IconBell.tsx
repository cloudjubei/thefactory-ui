import Svg, { Path } from 'react-native-svg'

export function IconBell({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 8a6 6 0 10-12 0c0 7-3 8-3 8h18s-3-1-3-8" stroke="#F59E0B" strokeWidth="2" />
      <Path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="#FB923C" strokeWidth="2" />
    </Svg>
  )
}
