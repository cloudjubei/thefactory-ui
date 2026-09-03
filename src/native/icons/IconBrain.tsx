import Svg, { Path } from 'react-native-svg'

export function IconBrain({ size = 24, color }: { size?: number; color?: string }) {
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
      <Path d="M8 6a3 3 0 0 0-3 3v6a3 3 0 1 0 3 3" stroke="#A855F7" strokeWidth="2" />
      <Path d="M8 6a3 3 0 1 0 0 6" stroke="#6366F1" strokeWidth="2" />
      <Path d="M16 6a3 3 0 0 1 3 3v6a3 3 0 1 1-3 3" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M16 6a3 3 0 1 1 0 6" stroke="#22D3EE" strokeWidth="2" />
      <Path d="M12 4v16" stroke="#10B981" strokeWidth="2" />
    </Svg>
  )
}
