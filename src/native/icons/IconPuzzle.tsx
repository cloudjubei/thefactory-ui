import Svg, { Path } from 'react-native-svg'

export function IconPuzzle({ size = 24, color }: { size?: number; color?: string }) {
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
        d="M10 3h4a2 2 0 0 1 2 2v3h3a2 2 0 0 1 2 2v4h-3a2 2 0 0 0-2 2v3h-4a2 2 0 0 1-2-2v-3H5a2 2 0 0 1-2-2v-4h3a2 2 0 0 0 2-2z"
        stroke="#6366F1"
        strokeWidth="2"
      />
      <Path d="M12 6a2 2 0 1 0 0 4" stroke="#22D3EE" strokeWidth="2" />
    </Svg>
  )
}
