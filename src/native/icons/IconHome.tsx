import Svg, { Path } from 'react-native-svg'

export function IconHome({ size = 24, color }: { size?: number; color?: string }) {
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
      <Path d="M3 11l9-7 9 7" stroke="#F59E0B" strokeWidth="2" />
      <Path d="M5 10.5V21h14V10.5" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M9 21v-6h6v6" stroke="#10B981" strokeWidth="2" />
    </Svg>
  )
}
