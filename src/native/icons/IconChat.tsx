import Svg, { Path } from 'react-native-svg'

export function IconChat({ size = 24, color }: { size?: number; color?: string }) {
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
        d="M21 15a4 4 0 0 1-4 4H8l-5 3V6a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"
        stroke="#14B8A6"
        strokeWidth="2"
      />
      <Path d="M8 9h8" stroke="#22D3EE" strokeWidth="2" />
      <Path d="M8 13h5" stroke="#22D3EE" strokeWidth="2" />
    </Svg>
  )
}
