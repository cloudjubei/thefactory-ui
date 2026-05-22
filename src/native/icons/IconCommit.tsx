import Svg, { Line, Circle } from 'react-native-svg'

export function IconCommit({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Line x1="3" y1="12" x2="9" y2="12" stroke="#3B82F6" strokeWidth="2" />
      <Circle cx="12" cy="12" r="3" stroke="#A855F7" strokeWidth="2" />
      <Line x1="15" y1="12" x2="21" y2="12" stroke="#22D3EE" strokeWidth="2" />
    </Svg>
  )
}
