import { Text, View } from 'react-native'

import { processAlreadyDoneLines, type ProcessFeatureDelivery } from '../../../headless'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type AlreadyDoneNoteProps = {
  /** The features the launch would work that an earlier run already delivered. */
  deliveries: readonly ProcessFeatureDelivery[]
}

/**
 * Before a launch: the features an earlier run already delivered, by the run
 * that did. Nothing when none were. Web peer: `web/compound/chat/AlreadyDoneNote`.
 */
export default function AlreadyDoneNote({ deliveries }: AlreadyDoneNoteProps) {
  const { status } = useNativeTheme()
  const lines = processAlreadyDoneLines(deliveries)
  if (lines.length === 0) return null
  return (
    <View
      style={{
        gap: 4,
        borderWidth: 1,
        borderColor: status.review.softBorder,
        backgroundColor: status.review.softBg,
        borderRadius: nativeRadii[2],
        paddingHorizontal: 10,
        paddingVertical: 8,
      }}
    >
      {lines.map((line) => (
        <Text key={line} style={{ fontSize: 11.5, fontWeight: '500', color: status.review.softFg }}>
          {line}
        </Text>
      ))}
    </View>
  )
}
