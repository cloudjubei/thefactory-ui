import Svg, { Rect, Path } from 'react-native-svg'

export function IconInfrastructure({ size = 24, color }: { size?: number; color?: string }) {
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
      <Rect x="3" y="10" width="6" height="10" stroke="#F59E0B" strokeWidth="2" />
      <Rect x="10.5" y="6" width="6" height="14" stroke="#3B82F6" strokeWidth="2" />
      <Rect x="18" y="3" width="3" height="17" stroke="#A855F7" strokeWidth="2" />
      <Path d="M3 10l6-4 7-3 5-1" stroke="#60A5FA" strokeWidth="2" />
    </Svg>
  )
}
