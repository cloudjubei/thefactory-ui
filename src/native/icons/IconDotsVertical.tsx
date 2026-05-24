import Svg, { Circle } from 'react-native-svg'

export function IconDotsVertical({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color}>
      <Circle cx="12" cy="6" r="1.6" fill="currentColor" />
      <Circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <Circle cx="12" cy="18" r="1.6" fill="currentColor" />
    </Svg>
  )
}
