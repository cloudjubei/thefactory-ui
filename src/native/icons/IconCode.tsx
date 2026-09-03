import Svg, { Path } from 'react-native-svg'

export function IconCode({ size = 24, color }: { size?: number; color?: string }) {
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
      <Path d="M8 6L3 12l5 6" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M16 6l5 6-5 6" stroke="#A855F7" strokeWidth="2" />
      <Path d="M10 20l4-16" stroke="#22D3EE" strokeWidth="2" />
    </Svg>
  )
}
