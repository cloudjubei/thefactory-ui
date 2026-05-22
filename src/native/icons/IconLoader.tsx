import Svg, { Circle, Path } from 'react-native-svg'

export function IconLoader({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="10" stroke="#93C5FD" strokeWidth="2" opacity="0.35" />
      <Path d="M22 12a10 10 0 0 0-10-10" stroke="#6366F1" strokeWidth="2" />
    </Svg>
  )
}
