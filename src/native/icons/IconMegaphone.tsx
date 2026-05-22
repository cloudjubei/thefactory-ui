import Svg, { Path } from 'react-native-svg'

export function IconMegaphone({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 10l9-4v12l-9-4z" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M12 14l3 5" stroke="#A855F7" strokeWidth="2" />
      <Path d="M18 9.5l3 1.5M18 14.5l3-1.5" stroke="#F59E0B" strokeWidth="2" />
      <Path d="M7 9v6" stroke="#10B981" strokeWidth="2" />
    </Svg>
  )
}
