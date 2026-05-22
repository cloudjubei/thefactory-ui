import Svg, { Path, Circle } from 'react-native-svg'

export function IconRocket({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14 3l7 7-6 6-7-7z" stroke="#6366F1" strokeWidth="2" />
      <Path d="M14 3s-4 1-7 4-4 7-4 7l6-2 7-7z" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M5 19l3-3" stroke="#FB923C" strokeWidth="2" />
      <Path d="M8 22l3-3" stroke="#F59E0B" strokeWidth="2" />
      <Circle cx="15" cy="9" r="1.5" stroke="#22D3EE" strokeWidth="2" />
    </Svg>
  )
}
