import Svg, { Circle, Path } from 'react-native-svg'

export function IconGlobe({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="9" stroke="#22D3EE" strokeWidth="2" />
      <Path d="M3 12h18" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M12 3a15 15 0 0 0 0 18a15 15 0 0 0 0-18z" stroke="#3B82F6" strokeWidth="2" />
    </Svg>
  )
}
