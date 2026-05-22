import Svg, { Path } from 'react-native-svg'

export function IconSafetyVest({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M7 4l-2 3v11h5V9" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M17 4l2 3v11h-5V9" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M12 5v14" stroke="#A855F7" strokeWidth="2" />
      <Path d="M5 12h14" stroke="#F59E0B" strokeWidth="2" />
      <Path d="M5 15h14" stroke="#10B981" strokeWidth="2" />
    </Svg>
  )
}
