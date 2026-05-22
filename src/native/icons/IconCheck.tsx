import Svg, { Polyline } from 'react-native-svg'

export function IconCheck({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" strokeWidth="2">
      <Polyline points="20 6 9 17 4 12" />
    </Svg>
  )
}
