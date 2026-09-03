import Svg, { Path } from 'react-native-svg'

export function IconDumbbell({ size = 24, color }: { size?: number; color?: string }) {
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
      <Path d="M6 12h12" stroke="#6366F1" strokeWidth="2" />
      <Path d="M5 9v6" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M7 10v4" stroke="#06B6D4" strokeWidth="2" />
      <Path d="M19 9v6" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M17 10v4" stroke="#06B6D4" strokeWidth="2" />
    </Svg>
  )
}
