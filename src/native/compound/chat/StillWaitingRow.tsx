import { Text, View } from 'react-native'

import { Button } from '../../primitives/Button'
import { IconChat } from '../../icons'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { nativeRadii } from '../../../tokens/native'
import {
  QUESTION_REOPEN_LABEL,
  QUESTION_STILL_WAITING,
} from '../../../headless/utils/agentQuestionConstants'

/** Native peer of [web's `StillWaitingRow`](../../../web/compound/chat/StillWaitingRow.tsx). */
export default function StillWaitingRow({
  question,
  onReopen,
}: {
  question: string
  onReopen: () => void
}) {
  const { status } = useNativeTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: status.on_hold.softBorder,
        borderRadius: nativeRadii[2],
        backgroundColor: status.on_hold.softBg,
      }}
    >
      <IconChat size={14} color={status.on_hold.softFg} />
      <Text numberOfLines={1} style={{ flex: 1, fontSize: 13, color: status.on_hold.softFg }}>
        {`${QUESTION_STILL_WAITING} `}
        <Text style={{ fontWeight: '700' }}>{question}</Text>
      </Text>
      <Button size="sm" variant="secondary" onPress={onReopen}>
        {QUESTION_REOPEN_LABEL}
      </Button>
    </View>
  )
}
