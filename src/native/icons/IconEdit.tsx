import Svg, { Path } from 'react-native-svg'

export function IconEdit({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 20h9" stroke="#93C5FD" strokeWidth="2" />
      <Path
        d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
        stroke="#A855F7"
        strokeWidth="2"
      />
    </Svg>
  )
}
