import Svg, { Path, Line } from 'react-native-svg'

export function IconWarningTriangle({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Path
        d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
        stroke="#F59E0B"
        strokeWidth="2"
      />
      <Line x1="12" y1="9" x2="12" y2="13" stroke="#EF4444" strokeWidth="2" />
      <Line x1="12" y1="17" x2="12.01" y2="17" stroke="#EF4444" strokeWidth="2" />
    </Svg>
  )
}
