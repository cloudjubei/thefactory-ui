import Svg, { Path, Circle } from 'react-native-svg'

export function IconPiggyBank({ size = 24, color }: { size?: number; color?: string }) {
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
      <Path d="M5 13c0-3 3-5 7-5s7 2 7 5-3 5-7 5-7-2-7-5z" stroke="#F59E0B" strokeWidth="2" />
      <Path d="M19 13h2" stroke="#A855F7" strokeWidth="2" />
      <Circle cx="9.5" cy="12" r="1" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M7 18l-1 2" stroke="#10B981" strokeWidth="2" />
      <Path d="M13 18l1 2" stroke="#10B981" strokeWidth="2" />
    </Svg>
  )
}
