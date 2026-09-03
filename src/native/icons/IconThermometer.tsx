import Svg, { Path, Circle } from 'react-native-svg'

export function IconThermometer({ size = 24, color }: { size?: number; color?: string }) {
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
      <Path d="M11 5a2 2 0 0 1 4 0v7.17a4 4 0 1 1-4 0V5z" stroke="#06B6D4" strokeWidth="2" />
      <Path d="M13 10v6" stroke="#22D3EE" strokeWidth="2" />
      <Circle cx="13" cy="18" r="1.5" stroke="#EF4444" strokeWidth="2" />
    </Svg>
  )
}
