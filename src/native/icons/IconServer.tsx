import Svg, { Rect, Circle, Path } from 'react-native-svg'

export function IconServer({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="4" y="4" width="16" height="6" rx="2" stroke="#3B82F6" strokeWidth="2" />
      <Rect x="4" y="14" width="16" height="6" rx="2" stroke="#6366F1" strokeWidth="2" />
      <Circle cx="7" cy="7" r="1" fill="#10B981" />
      <Circle cx="10" cy="7" r="1" fill="#F59E0B" />
      <Circle cx="7" cy="17" r="1" fill="#10B981" />
      <Circle cx="10" cy="17" r="1" fill="#EF4444" />
      <Path d="M14 7h5" stroke="#22D3EE" strokeWidth="2" />
      <Path d="M14 17h5" stroke="#A855F7" strokeWidth="2" />
    </Svg>
  )
}
