import { Text, View } from 'react-native'

import { VIDEO_ATTACHMENT_TEXT, videoCostLabel, type VideoCostView } from '../../../headless'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import CostChip from '../chips/CostChip'

export interface VideoCostChipProps {
  cost: VideoCostView
  /** Only the reading cost, where the row is short; the details still give both. */
  compact?: boolean
}

/**
 * What a video costs an agent, as the app's cost chip. It counts tokens rather
 * than dollars: no model is known when a video is attached.
 */
export default function VideoCostChip({ cost, compact = false }: VideoCostChipProps) {
  const { theme } = useNativeTheme()
  const figure = {
    fontSize: 13,
    color: theme.text.primary,
    fontVariant: ['tabular-nums' as const],
  }
  return (
    <CostChip
      label={videoCostLabel(cost, compact)}
      title={VIDEO_ATTACHMENT_TEXT.costTitle}
      details={
        <View
          style={{
            gap: nativeSpace[1],
            paddingHorizontal: nativeSpace[4],
            paddingBottom: nativeSpace[5],
          }}
        >
          <Text style={figure}>{cost.read}</Text>
          <Text style={figure}>{cost.closer}</Text>
          <Text style={{ fontSize: 13, color: theme.text.secondary }}>
            {VIDEO_ATTACHMENT_TEXT.costNote}
          </Text>
        </View>
      }
    />
  )
}
