import Svg, { Path, Circle } from 'react-native-svg'

export function IconWrench({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Path
        d="M21 3a7 7 0 0 1-9.9 9.9L7 17l-3 3 3-7 4.1-4.1A7 7 0 0 1 21 3z"
        stroke="#EF4444"
        strokeWidth="2"
      />
      <Circle cx="7" cy="17" r="0.5" fill="#A855F7" stroke="#A855F7" />
    </Svg>
  )
}
