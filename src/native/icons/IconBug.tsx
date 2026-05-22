import Svg, { Rect, Path } from 'react-native-svg'

export function IconBug({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="7" y="8" width="10" height="8" rx="4" stroke="#EF4444" strokeWidth="2" />
      <Path d="M12 8V4" stroke="#A855F7" strokeWidth="2" />
      <Path d="M4 12h4" stroke="#22D3EE" strokeWidth="2" />
      <Path d="M16 12h4" stroke="#22D3EE" strokeWidth="2" />
      <Path d="M5 9l3 2" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M19 9l-3 2" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M5 15l3-2" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M19 15l-3-2" stroke="#3B82F6" strokeWidth="2" />
    </Svg>
  )
}
