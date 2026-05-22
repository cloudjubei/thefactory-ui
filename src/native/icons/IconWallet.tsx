import Svg, { Path } from 'react-native-svg'

export function IconWallet({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Path
        d="M4 7h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"
        stroke="#6366F1"
        strokeWidth="2"
      />
      <Path d="M18 11h3v4h-3" stroke="#10B981" strokeWidth="2" />
      <Path d="M4 7l2-2h8" stroke="#A855F7" strokeWidth="2" />
    </Svg>
  )
}
