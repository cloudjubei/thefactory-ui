import Svg, { Path, Rect } from 'react-native-svg'

export function IconStore({ size = 24, color }: { size?: number; color?: string }) {
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
      <Path d="M3 8h18l-2 4H5z" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M4 8l2-3h12l2 3" stroke="#A855F7" strokeWidth="2" />
      <Rect x="5" y="12" width="14" height="8" rx="2" stroke="#10B981" strokeWidth="2" />
      <Rect x="8" y="13" width="4" height="7" rx="1" stroke="#F59E0B" strokeWidth="2" />
    </Svg>
  )
}
