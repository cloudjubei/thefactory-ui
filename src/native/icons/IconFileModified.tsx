import Svg, { Circle, Path } from 'react-native-svg'

export function IconFileModified({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="9" stroke="#F59E0B" strokeWidth="2" />
      <Path d="M9 15l6-6" stroke="#F59E0B" strokeWidth="2" />
      <Path d="M14.5 8.5l1 1" stroke="#F59E0B" strokeWidth="2" />
      <Path d="M9 15h3" stroke="#F59E0B" strokeWidth="2" />
    </Svg>
  )
}
