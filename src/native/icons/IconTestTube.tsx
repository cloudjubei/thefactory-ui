import Svg, { Path, Circle } from 'react-native-svg'

export function IconTestTube({ size = 24, color }: { size?: number; color?: string }) {
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
      <Path d="M9 3h6" stroke="#22D3EE" strokeWidth="2" />
      <Path d="M10 3v8a6 6 0 1 0 4 0V3" stroke="#10B981" strokeWidth="2" />
      <Path d="M8 11h8" stroke="#60A5FA" strokeWidth="2" />
      <Circle cx="12" cy="15" r="1" fill="#22D3EE" />
      <Circle cx="14.5" cy="18" r="1.2" fill="#10B981" />
    </Svg>
  )
}
