import { Text, View } from 'react-native'
import { TICKET_STATUS_TONE, type TicketStatusLozengeView } from '../../../headless'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type TicketStatusLozengeProps = {
  view: TicketStatusLozengeView
}

/**
 * Native peer of [web's `TicketStatusLozenge`](../../../web/compound/chips/TicketStatusLozenge.tsx):
 * a ticket's status as a lozenge, coloured by its Jira category in the app's own
 * status tones. The one status pill a ticket chip, a ticket's card and a status
 * move share.
 */
export default function TicketStatusLozenge({ view }: TicketStatusLozengeProps) {
  const { status } = useNativeTheme()
  const tone = status[TICKET_STATUS_TONE[view.tone]]
  return (
    <View
      style={{
        flexShrink: 1,
        maxWidth: '100%',
        backgroundColor: tone.softBg,
        borderColor: tone.softBorder,
        borderWidth: 1,
        borderRadius: 4,
        paddingHorizontal: nativeSpace[2],
        paddingVertical: 1,
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          fontSize: 10.5,
          fontWeight: '600',
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          color: tone.softFg,
        }}
      >
        {view.label}
      </Text>
    </View>
  )
}
