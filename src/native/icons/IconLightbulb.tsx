import Svg, { Path } from 'react-native-svg'

export function IconLightbulb({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 18h6" stroke="#FB923C" strokeWidth="2" />
      <Path d="M10 22h4" stroke="#FB923C" strokeWidth="2" />
      <Path
        d="M12 2a7 7 0 0 0-4 13c1 1 1 2 1 3h6c0-1 0-2 1-3a7 7 0 0 0-4-13z"
        stroke="#F59E0B"
        strokeWidth="2"
      />
    </Svg>
  )
}
