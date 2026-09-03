import Svg, { Rect, Path } from 'react-native-svg'

export function IconMonitor({ size = 24, color }: { size?: number; color?: string }) {
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
      <Rect x="3" y="4" width="18" height="12" rx="2" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M8 20h8" stroke="#A855F7" strokeWidth="2" />
      <Path d="M12 16v4" stroke="#A855F7" strokeWidth="2" />
    </Svg>
  )
}
