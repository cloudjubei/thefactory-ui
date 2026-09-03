import Svg, { Path } from 'react-native-svg'

export function IconDollar({ size = 24, color }: { size?: number; color?: string }) {
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
      <Path
        d="M12 5c-2.2 0-4 1.1-4 3s1.2 3 4 3 4 1.1 4 3-1.8 3-4 3"
        stroke="#10B981"
        strokeWidth="2"
      />
      <Path d="M12 3v18" stroke="#3B82F6" strokeWidth="2" />
    </Svg>
  )
}
