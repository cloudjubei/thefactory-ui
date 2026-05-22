import Svg, { Path } from 'react-native-svg'

export function IconDocument({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Path
        d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"
        stroke="#93C5FD"
        strokeWidth="2"
      />
      <Path d="M14 2v6h6" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M9 13h6" stroke="#22D3EE" strokeWidth="2" />
      <Path d="M9 17h6" stroke="#22D3EE" strokeWidth="2" />
    </Svg>
  )
}
