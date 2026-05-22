import Svg, { Path } from 'react-native-svg'

export function IconCrane({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 20h16" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M7 20V6" stroke="#A855F7" strokeWidth="2" />
      <Path d="M7 6h10" stroke="#F59E0B" strokeWidth="2" />
      <Path d="M7 6H4" stroke="#10B981" strokeWidth="2" />
      <Path d="M13 6v5" stroke="#EF4444" strokeWidth="2" />
      <Path d="M13 13c0 1 .8 2 2 2" stroke="#EF4444" strokeWidth="2" />
    </Svg>
  )
}
