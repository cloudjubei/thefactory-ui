import Svg, { Circle, Path } from 'react-native-svg'

export function IconCheckCircle({ size = 24, color }: { size?: number; color?: string }) {
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
      <Circle cx="12" cy="12" r="10" stroke="#10B981" strokeWidth="2" />
      <Path d="M8 12l3 3 5-5" stroke="#10B981" strokeWidth="2" />
    </Svg>
  )
}
