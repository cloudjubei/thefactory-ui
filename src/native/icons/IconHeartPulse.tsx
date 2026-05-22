import Svg, { Path } from 'react-native-svg'

export function IconHeartPulse({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Path
        d="M12 21s-7-4.5-7-10a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 5.5-7 10-7 10"
        stroke="#EF4444"
        strokeWidth="2"
      />
      <Path d="M4 12h3l2-2 2 4 2-2h5" stroke="#F59E0B" strokeWidth="2" />
    </Svg>
  )
}
