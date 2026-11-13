import { Text, View } from 'react-native'

import type { ChatContext } from '../../../headless/api'
import { PROCESS_LIVE_TONE } from '../../../headless/utils/processView'
import type { ProcessWaitingDelegatedView } from '../../../headless/utils/processWaitingViewTypes'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'
import Spinner from '../../primitives/Spinner'

export default function WaitingDelegated({
  view,
  onOpenChat,
}: {
  view: ProcessWaitingDelegatedView
  onOpenChat?: (context: ChatContext) => void
}) {
  const { theme, status } = useNativeTheme()
  const tone = status[PROCESS_LIVE_TONE]
  const chat = view.chatContext
  return (
    <View
      style={{
        gap: nativeSpace[2],
        borderRadius: nativeRadii[2],
        padding: nativeSpace[3],
        backgroundColor: tone.softBg,
        borderWidth: 1,
        borderColor: tone.softBorder,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
        <Spinner size={14} color={tone.softFg} />
        <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: tone.softFg }}>
          {view.heading}
        </Text>
      </View>
      <Text style={{ fontSize: 12, lineHeight: 17, color: theme.text.secondary }}>
        {view.detail}
      </Text>
      {onOpenChat ? (
        <Button
          size="sm"
          variant="secondary"
          disabled={!chat}
          onPress={() => chat && onOpenChat(chat)}
        >
          {view.openLabel}
        </Button>
      ) : null}
    </View>
  )
}
