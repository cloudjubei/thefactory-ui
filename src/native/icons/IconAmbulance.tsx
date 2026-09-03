import Svg, { Rect, Path, Circle } from 'react-native-svg'

export function IconAmbulance({ size = 24, color }: { size?: number; color?: string }) {
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
      <Rect x="3" y="10" width="12" height="7" rx="2" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M15 12h3l3 3v2h-3" stroke="#60A5FA" strokeWidth="2" />
      <Circle cx="7" cy="19" r="2" stroke="#10B981" strokeWidth="2" />
      <Circle cx="16" cy="19" r="2" stroke="#10B981" strokeWidth="2" />
      <Path d="M7 13h4" stroke="#EF4444" strokeWidth="2" />
      <Path d="M9 11v4" stroke="#EF4444" strokeWidth="2" />
    </Svg>
  )
}
