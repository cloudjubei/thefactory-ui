import Svg, { Path } from 'react-native-svg'

export function IconHourglass({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      color={color}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M6 2v6c0 2.2 1.8 4 4 4h4c2.2 0 4-1.8 4-4V2" />
      <Path d="M6 12v6c0 2.2 1.8 4 4 4h4c2.2 0 4-1.8 4-4v-6" />
      <Path d="M6 6h12" />
      <Path d="M6 18h12" />
    </Svg>
  )
}
