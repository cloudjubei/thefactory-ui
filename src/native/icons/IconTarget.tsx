import Svg, { Circle } from 'react-native-svg'

export function IconTarget({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="11" stroke="#EF4444" strokeWidth="2" />
      <Circle cx="12" cy="12" r="10" stroke="#FFFFFF" strokeWidth="1" />
      <Circle cx="12" cy="12" r="8" stroke="#EF4444" strokeWidth="2" />
      <Circle cx="12" cy="12" r="7" stroke="#FFFFFF" strokeWidth="1" />
      <Circle cx="12" cy="12" r="5" stroke="#EF4444" strokeWidth="2" />
      <Circle cx="12" cy="12" r="3" stroke="#FFFFFF" strokeWidth="2" />
      <Circle cx="12" cy="12" r="1" fill="#EF4444" stroke="#EF4444" strokeWidth="2" />
    </Svg>
  )
}
