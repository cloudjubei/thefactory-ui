import Svg, { Rect, Path } from 'react-native-svg'

export function IconCollection({ size = 24, color }: { size?: number; color?: string }) {
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
      <Rect x="3" y="6" width="13" height="13" rx="2" stroke="#06B6D4" strokeWidth="2" />
      <Path d="M7 3h10a2 2 0 0 1 2 2v10" stroke="#93C5FD" strokeWidth="2" />
    </Svg>
  )
}
