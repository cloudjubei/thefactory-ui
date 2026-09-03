import Svg, { Path } from 'react-native-svg'

export function IconShovel({ size = 24, color }: { size?: number; color?: string }) {
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
      <Path d="M5 5l7 7" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M4 4l2-2 2 2-2 2-2-2z" stroke="#A855F7" strokeWidth="2" />
      <Path
        d="M14 12c1.5 1.5 1.5 3.5 0 5l-2 2-3-3 2-2c1.5-1.5 3.5-1.5 5 0z"
        stroke="#F59E0B"
        strokeWidth="2"
      />
    </Svg>
  )
}
