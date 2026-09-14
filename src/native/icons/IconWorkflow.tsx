import Svg, { Circle, Line } from 'react-native-svg'

export function IconWorkflow({ size = 24, color }: { size?: number; color?: string }) {
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
      <Line x1="7" y1="7" x2="17" y2="7" stroke="#60A5FA" strokeWidth="2" />
      <Line x1="17" y1="7" x2="17" y2="17" stroke="#A855F7" strokeWidth="2" />
      <Line x1="17" y1="17" x2="7" y2="17" stroke="#10B981" strokeWidth="2" />
      <Circle cx="5" cy="7" r="2.5" fill="#F59E0B" />
      <Circle cx="19" cy="12" r="2.5" fill="#EF4444" />
      <Circle cx="5" cy="17" r="2.5" fill="#22D3EE" />
    </Svg>
  )
}
