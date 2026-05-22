import Svg, { Path, Polyline } from 'react-native-svg'

export function IconRefreshChat({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 11a8 8 0 0 1 13.66-5.66" />
      <Polyline points="3 4 3 11 10 11" />
      <Path d="M21 13a8 8 0 0 1-13.66 5.66" />
      <Polyline points="21 20 21 13 14 13" />
    </Svg>
  )
}

export default IconRefreshChat
