import Svg, { Path } from 'react-native-svg'

export function IconHammer({ size = 24, color }: { size?: number; color?: string }) {
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
      <Path d="M5 19l7-7" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M14 7h4l-2 2h-3" stroke="#F59E0B" strokeWidth="2" />
      <Path d="M14 7c-1-1-2-1-3 0l-1 1" stroke="#A855F7" strokeWidth="2" />
    </Svg>
  )
}
