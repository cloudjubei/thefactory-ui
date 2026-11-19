import Svg, { Circle, Path } from 'react-native-svg'

export function IconRoute({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      color={color}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Circle cx="5.25" cy="18.75" r="2.25" />
      <Circle cx="18.75" cy="5.25" r="2.25" />
      <Path d="M7.5 18.75h8.25a3 3 0 0 0 0-6h-7.5a3 3 0 0 1 0-6h8.25" />
    </Svg>
  )
}

export default IconRoute
