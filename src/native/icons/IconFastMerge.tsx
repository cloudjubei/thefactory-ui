import Svg, { Circle, Path } from 'react-native-svg'

export function IconFastMerge({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="6" cy="8" r="2" stroke="#3B82F6" strokeWidth="2" />
      <Circle cx="6" cy="16" r="2" stroke="#A855F7" strokeWidth="2" />
      <Path d="M9 8c3 0 3 2 3 4" stroke="#22D3EE" strokeWidth="2" />
      <Path d="M9 16c3 0 3-2 3-4" stroke="#22D3EE" strokeWidth="2" />
      <Path d="M12 12h6" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M18 12l-3-3" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M18 12l-3 3" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M14.5 14.5L16 16l4-4" stroke="#10B981" strokeWidth="2" />
    </Svg>
  )
}
