import Svg, { Circle, Path } from 'react-native-svg'

export function IconPullRequest({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="7" cy="6" r="2" stroke="#3B82F6" strokeWidth="2" />
      <Circle cx="7" cy="18" r="2" stroke="#A855F7" strokeWidth="2" />
      <Circle cx="17" cy="12" r="2" stroke="#22D3EE" strokeWidth="2" />
      <Path d="M7 8v8" stroke="#A855F7" strokeWidth="2" />
      <Path d="M9 12h6" stroke="#10B981" strokeWidth="2" />
      <Path d="M13 9l3 3-3 3" stroke="#10B981" strokeWidth="2" />
    </Svg>
  )
}
