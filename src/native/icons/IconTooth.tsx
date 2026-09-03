import Svg, { Path } from 'react-native-svg'

export function IconTooth({ size = 24, color }: { size?: number; color?: string }) {
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
      <Path d="M8 20c0-3 1-6 4-6s4 3 4 6" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M6 10a6 6 0 0 1 12 0c0 2-1 4-3 4H9c-2 0-3-2-3-4z" stroke="#6366F1" strokeWidth="2" />
    </Svg>
  )
}
