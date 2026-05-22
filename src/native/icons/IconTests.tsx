import Svg, { Path } from 'react-native-svg'

export function IconTests({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 3h6" stroke="#22D3EE" strokeWidth="2" />
      <Path d="M10 3v7a6 6 0 1 0 4 0V3" stroke="#10B981" strokeWidth="2" />
      <Path d="M8 10h8" stroke="#60A5FA" strokeWidth="2" />
      <Path d="M15 16l2 2 4-4" stroke="#10B981" strokeWidth="2" />
    </Svg>
  )
}
