import Svg, { Path, Rect } from 'react-native-svg'

export function IconMedicalCross({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 5v14" stroke="#10B981" strokeWidth="2" />
      <Path d="M5 12h14" stroke="#10B981" strokeWidth="2" />
      <Rect x="4" y="4" width="16" height="16" rx="3" stroke="#3B82F6" strokeWidth="2" />
    </Svg>
  )
}
