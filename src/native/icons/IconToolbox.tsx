import Svg, { Rect, Path } from 'react-native-svg'

export function IconToolbox({ size = 24, color }: { size?: number; color?: string }) {
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
      <Rect x="3" y="8" width="18" height="11" rx="2" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M7 8V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" stroke="#A855F7" strokeWidth="2" />
      <Path d="M3 13h18" stroke="#10B981" strokeWidth="2" />
      <Path d="M10 13v3" stroke="#F59E0B" strokeWidth="2" />
      <Path d="M14 13v3" stroke="#F59E0B" strokeWidth="2" />
    </Svg>
  )
}
