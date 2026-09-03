import Svg, { Circle, Line } from 'react-native-svg'

export function IconExclamation({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      color={color}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Circle cx="12" cy="12" r="10" stroke="#F59E0B" strokeWidth="2" />
      <Line x1="12" y1="8" x2="12" y2="12" stroke="#EF4444" strokeWidth="2" />
      <Line x1="12" y1="16" x2="12.01" y2="16" stroke="#EF4444" strokeWidth="2" />
    </Svg>
  )
}
