import { Text, View } from 'react-native'

import {
  PARK_ANSWERS_COPY,
  PROCESS_MANAGER_OPEN_CHAT_LABEL,
  type ProcessRunManagerView,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'

export type RunManagerBarProps = {
  status: NonNullable<ProcessRunManagerView['status']>
  /** What the run stopped on, as its stop says it. */
  headline?: string
  /** Open the run's chat, where the manager works — offered while it waits on a card there. */
  onOpenChat?: () => void
}

/**
 * Native peer of
 * [web's `RunManagerBar`](../../../web/compound/process/RunManagerBar.tsx).
 * The slim line at the top of a run while its manager has the stop: looking
 * into it, holding it until something is done, or waiting on a card it raised.
 * Nothing is asked of the person until the manager hands the stop over with
 * its answers.
 */
export default function RunManagerBar({
  status: managerStatus,
  headline,
  onOpenChat,
}: RunManagerBarProps) {
  const { theme, status } = useNativeTheme()
  const waiting = managerStatus.state === 'waiting'
  const variant = waiting ? status.on_hold : status.working
  return (
    <View
      accessibilityRole="summary"
      accessibilityLiveRegion="polite"
      style={{
        marginHorizontal: nativeSpace[3],
        marginTop: nativeSpace[3],
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        columnGap: nativeSpace[3],
        rowGap: 6,
        borderRadius: nativeRadii[4],
        borderWidth: 1,
        borderColor: variant.softBorder,
        backgroundColor: variant.softBg,
        paddingHorizontal: nativeSpace[4],
        paddingVertical: nativeSpace[3],
      }}
    >
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: variant.fg }} />
      <View style={{ flex: 1, minWidth: 200, gap: 2 }}>
        {headline ? (
          <Text style={{ fontSize: 13.5, fontWeight: '600', color: theme.text.primary }}>
            {headline}
          </Text>
        ) : null}
        <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>{managerStatus.text}</Text>
        {managerStatus.state === 'looking' ? (
          <Text style={{ fontSize: 12, color: theme.text.muted }}>
            {PARK_ANSWERS_COPY.answersComing}
          </Text>
        ) : null}
      </View>
      {waiting && onOpenChat ? (
        <Button size="sm" variant="secondary" onPress={onOpenChat}>
          {PROCESS_MANAGER_OPEN_CHAT_LABEL}
        </Button>
      ) : null}
    </View>
  )
}
