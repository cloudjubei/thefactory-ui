import Svg, { Path } from 'react-native-svg'

export function IconArrowDown({ size = 24, color }: { size?: number; color?: string }) {
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
      <Path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2" />
    </Svg>
  )
}
