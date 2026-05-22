import Svg, { Rect } from 'react-native-svg'

export function IconWorkspace({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="3" width="8" height="8" rx="2" stroke="#6366F1" strokeWidth="2" />
      <Rect x="13" y="3" width="8" height="5" rx="2" stroke="#93C5FD" strokeWidth="2" />
      <Rect x="3" y="13" width="6" height="8" rx="2" stroke="#10B981" strokeWidth="2" />
      <Rect x="11" y="13" width="10" height="8" rx="2" stroke="#F59E0B" strokeWidth="2" />
    </Svg>
  )
}
