import Svg, { Path, Circle } from 'react-native-svg'

export function IconStethoscope({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 4v4" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M10 4v4" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M6 8a4 4 0 0 0 8 0" stroke="#6366F1" strokeWidth="2" />
      <Path d="M10 12v2a4 4 0 0 0 8 0" stroke="#06B6D4" strokeWidth="2" />
      <Circle cx="18" cy="14" r="2" stroke="#10B981" strokeWidth="2" />
      <Path d="M10 12h2" stroke="#22D3EE" strokeWidth="2" />
    </Svg>
  )
}
