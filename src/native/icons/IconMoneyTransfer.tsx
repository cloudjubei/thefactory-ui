import Svg, { Path, Polyline } from 'react-native-svg'

export function IconMoneyTransfer({ size = 24, color }: { size?: number; color?: string }) {
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
      <Path d="M4 7h10a3 3 0 0 1 0 6H4" stroke="#10B981" strokeWidth="2" />
      <Polyline points="7 5 4 7 7 9" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M20 17H10a3 3 0 0 1 0-6h10" stroke="#A855F7" strokeWidth="2" />
      <Polyline points="17 15 20 17 17 19" stroke="#6366F1" strokeWidth="2" />
    </Svg>
  )
}
