import Svg, { Path } from 'react-native-svg'

export function IconReceipt({ size = 24, color }: { size?: number; color?: string }) {
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
        d="M7 4h10a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2z"
        stroke="#6366F1"
        strokeWidth="2"
      />
      <Path d="M9 9h6M9 13h6" stroke="#10B981" strokeWidth="2" />
    </Svg>
  )
}
