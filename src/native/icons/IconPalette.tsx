import Svg, { Path, Circle } from 'react-native-svg'

export function IconPalette({ size = 24, color }: { size?: number; color?: string }) {
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
        d="M12 3a9 9 0 1 0 0 18h2a3 3 0 0 0 0-6h-1a2 2 0 0 1-2-2v-1a9 9 0 0 0 1-9z"
        stroke="#A855F7"
        strokeWidth="2"
      />
      <Circle cx="7.5" cy="10" r="1.2" fill="#F59E0B" />
      <Circle cx="9.5" cy="6.5" r="1.2" fill="#22D3EE" />
      <Circle cx="12.5" cy="5.5" r="1.2" fill="#3B82F6" />
      <Circle cx="15" cy="7.5" r="1.2" fill="#10B981" />
    </Svg>
  )
}
