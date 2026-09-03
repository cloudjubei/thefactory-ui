import Svg, { Path, Rect } from 'react-native-svg'

export function IconMic({ size = 24, color }: { size?: number; color?: string }) {
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
      <Rect x="9" y="3" width="6" height="11" rx="3" stroke="#06B6D4" strokeWidth="2" />
      <Path d="M5 11a7 7 0 0 0 14 0" stroke="#22D3EE" strokeWidth="2" />
      <Path d="M12 18v3" stroke="#22D3EE" strokeWidth="2" />
    </Svg>
  )
}
