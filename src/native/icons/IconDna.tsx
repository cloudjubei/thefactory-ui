import Svg, { Path } from 'react-native-svg'

export function IconDna({ size = 24, color }: { size?: number; color?: string }) {
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
      <Path d="M7 3c3 3 7 3 10 0" stroke="#6366F1" strokeWidth="2" />
      <Path d="M7 21c3-3 7-3 10 0" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M7 3v10c0 3.5 3 4.5 5 5" stroke="#06B6D4" strokeWidth="2" />
      <Path d="M17 21V11c0-3.5-3-4.5-5-5" stroke="#22D3EE" strokeWidth="2" />
      <Path d="M8 8h8" stroke="#10B981" strokeWidth="2" />
      <Path d="M8 12h8" stroke="#10B981" strokeWidth="2" />
      <Path d="M8 16h8" stroke="#10B981" strokeWidth="2" />
    </Svg>
  )
}
