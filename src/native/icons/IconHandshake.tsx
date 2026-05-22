import Svg, { Path } from 'react-native-svg'

export function IconHandshake({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M2 10l4-4 3 3-4 4" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M22 10l-4-4-3 3 4 4" stroke="#A855F7" strokeWidth="2" />
      <Path d="M7 13l3 3a2 2 0 0 0 2 0l5-5" stroke="#10B981" strokeWidth="2" />
      <Path d="M10 16l1.5 1.5M12 15.5L13.5 17M14 14.5L15.5 16" stroke="#F59E0B" strokeWidth="1.5" />
    </Svg>
  )
}
