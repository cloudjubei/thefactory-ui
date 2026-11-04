import Svg, { Path, Rect } from 'react-native-svg'

export function IconVideo({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? 'currentColor'}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Rect x={3} y={5} width={18} height={14} rx={2} />
      <Path d="M10 9.5v5l4-2.5z" />
    </Svg>
  )
}
