import Svg, { Path } from 'react-native-svg'

export function IconDiff({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color}>
      <Path
        d="M5.8 7.2h5.8M8.7 4.3v5.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Path d="M13 16.8h5.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <Path d="M3.8 19.9L20.2 3.4" stroke="currentColor" strokeWidth="1.5" opacity={0.45} />
    </Svg>
  )
}

export default IconDiff
