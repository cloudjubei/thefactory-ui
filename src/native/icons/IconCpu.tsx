import Svg, { Rect, Path } from 'react-native-svg'

export function IconCpu({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="7" y="7" width="10" height="10" rx="2" stroke="#3B82F6" strokeWidth="2" />
      <Rect x="10" y="10" width="4" height="4" rx="1" stroke="#A855F7" strokeWidth="2" />
      <Path
        d="M7 3v3M12 3v3M17 3v3M7 21v-3M12 21v-3M17 21v-3M3 7h3M3 12h3M3 17h3M21 7h-3M21 12h-3M21 17h-3"
        stroke="#22D3EE"
        strokeWidth="2"
      />
    </Svg>
  )
}
