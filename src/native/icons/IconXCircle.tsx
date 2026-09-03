import Svg, { Circle, Line } from 'react-native-svg'

export function IconXCircle({ size = 24, color }: { size?: number; color?: string }) {
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
      <Circle cx="12" cy="12" r="10" stroke="#EF4444" strokeWidth="2" />
      <Line x1="9" y1="9" x2="15" y2="15" stroke="#EF4444" strokeWidth="2" />
      <Line x1="15" y1="9" x2="9" y2="15" stroke="#EF4444" strokeWidth="2" />
    </Svg>
  )
}
