import Svg, { Path } from 'react-native-svg'

export function IconLungs({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 5v6" stroke="#06B6D4" strokeWidth="2" />
      <Path d="M12 11c-3 0-5 2-5 5v3" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M12 11c3 0 5 2 5 5v3" stroke="#6366F1" strokeWidth="2" />
      <Path d="M7 9l3 2" stroke="#60A5FA" strokeWidth="2" />
      <Path d="M17 9l-3 2" stroke="#60A5FA" strokeWidth="2" />
    </Svg>
  )
}
