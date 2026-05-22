import Svg, { Path } from 'react-native-svg'

export function IconBank({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 9h16L12 4 4 9z" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M6 9v8M10 9v8M14 9v8M18 9v8" stroke="#10B981" strokeWidth="2" />
      <Path d="M3 17h18" stroke="#A855F7" strokeWidth="2" />
    </Svg>
  )
}
