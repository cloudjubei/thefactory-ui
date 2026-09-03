import Svg, { Circle, Path } from 'react-native-svg'

export function IconBasketball({ size = 24, color }: { size?: number; color?: string }) {
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
      <Circle cx="12" cy="12" r="8" stroke="#6366F1" strokeWidth="2" />
      <Path d="M4 12h16" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M12 4v16" stroke="#06B6D4" strokeWidth="2" />
      <Path d="M6 6c3 2.5 9 2.5 12 0" stroke="#10B981" strokeWidth="2" />
      <Path d="M6 18c3-2.5 9-2.5 12 0" stroke="#22D3EE" strokeWidth="2" />
    </Svg>
  )
}
