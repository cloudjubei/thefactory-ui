import Svg, { Polygon } from 'react-native-svg'

export function IconPlay({
  size = 24,
  color,
  fill = '#10B981',
}: {
  size?: number
  color?: string
  fill?: string
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color}>
      <Polygon points="8,5 19,12 8,19" fill={fill} />
    </Svg>
  )
}
