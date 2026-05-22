import Svg, { Polyline } from 'react-native-svg'

export function IconDoubleUp({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="6 14 12 8 18 14" stroke="#3B82F6" strokeWidth="2" />
      <Polyline points="6 20 12 14 18 20" stroke="#6366F1" strokeWidth="2" />
    </Svg>
  )
}
