import { View } from 'react-native'
import DotBadge from './DotBadge'
import Spinner from './Spinner'

export interface SpinnerWithDotProps {
  size?: number
  showDot?: boolean
  dotColor?: string
  className?: string
}

export default function SpinnerWithDot({
  size = 16,
  showDot = false,
  dotColor,
  className,
}: SpinnerWithDotProps) {
  const dotSize = size <= 14 ? 6 : 8
  return (
    <View className={className} style={{ position: 'relative' }}>
      <Spinner size={size} />
      {showDot && (
        <View style={{ position: 'absolute', top: -2, right: -2 }}>
          <DotBadge size={dotSize} color={dotColor} ringWidth={2} />
        </View>
      )}
    </View>
  )
}
