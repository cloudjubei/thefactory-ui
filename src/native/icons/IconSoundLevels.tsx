import Svg, { Line } from 'react-native-svg'

export function IconSoundLevels({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      color={color}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Line x1="4" y1="10" x2="4" y2="14" />
      <Line x1="8" y1="6" x2="8" y2="18" />
      <Line x1="12" y1="3" x2="12" y2="21" />
      <Line x1="16" y1="8" x2="16" y2="16" />
      <Line x1="20" y1="11" x2="20" y2="13" />
    </Svg>
  )
}
