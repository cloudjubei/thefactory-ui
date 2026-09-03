import Svg, { Rect, Circle, Path } from 'react-native-svg'

export function IconRobot({ size = 24, color }: { size?: number; color?: string }) {
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
      <Rect x="4" y="7" width="16" height="12" rx="3" stroke="#A855F7" strokeWidth="2" />
      <Circle cx="9" cy="13" r="1.5" stroke="#F59E0B" strokeWidth="2" />
      <Circle cx="15" cy="13" r="1.5" stroke="#F59E0B" strokeWidth="2" />
      <Path d="M12 3v3" stroke="#EF4444" strokeWidth="2" />
      <Rect x="10" y="3" width="4" height="2" rx="1" stroke="#EF4444" strokeWidth="2" />
    </Svg>
  )
}
