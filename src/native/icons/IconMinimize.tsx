import Svg, { Polyline } from 'react-native-svg'

export function IconMinimize({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="9 3 9 9 3 9" stroke="#0EA5E9" strokeWidth="2" />
      <Polyline points="15 3 15 9 21 9" stroke="#0EA5E9" strokeWidth="2" />
      <Polyline points="15 21 15 15 21 15" stroke="#0EA5E9" strokeWidth="2" />
      <Polyline points="9 21 9 15 3 15" stroke="#0EA5E9" strokeWidth="2" />
    </Svg>
  )
}
