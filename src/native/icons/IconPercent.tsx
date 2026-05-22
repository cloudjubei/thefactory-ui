import Svg, { Path, Circle } from 'react-native-svg'

export function IconPercent({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 19L19 5" stroke="#6366F1" strokeWidth="2" />
      <Circle cx="7" cy="7" r="2" stroke="#10B981" strokeWidth="2" />
      <Circle cx="17" cy="17" r="2" stroke="#F59E0B" strokeWidth="2" />
    </Svg>
  )
}
