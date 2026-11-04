import { Pressable, Text, View } from 'react-native'

import { TICKET_MOVE_TEXT, type TicketMoveFieldView } from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import TicketChip from '../chips/TicketChip'

export type TicketMoveFieldProps = {
  field: TicketMoveFieldView
  ticked: boolean
  onToggle: (ticked: boolean) => void
  disabled?: boolean
}

/**
 * Native peer of [web's `TicketMoveField`](../../../web/compound/chat/TicketMoveField.tsx):
 * a launch's ticket, with the one change approving makes to it, ticked by default,
 * or why there is none and so no tick box.
 */
export default function TicketMoveField({
  field,
  ticked,
  onToggle,
  disabled = false,
}: TicketMoveFieldProps) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.base,
      }}
    >
      {field.kind === 'offer' ? (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: ticked, disabled }}
          accessibilityLabel={
            ticked
              ? TICKET_MOVE_TEXT.leaveIt(field.decision.ticketKey)
              : TICKET_MOVE_TEXT.moveIt(field.change)
          }
          disabled={disabled}
          onPress={() => onToggle(!ticked)}
          hitSlop={8}
          style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}
        >
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              borderWidth: 1.5,
              borderColor: ticked ? theme.accent.primary : theme.border.strong,
              backgroundColor: ticked ? theme.accent.primary : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {ticked ? (
              <Text style={{ fontSize: 12, color: theme.text.inverted, fontWeight: '700' }}>✓</Text>
            ) : null}
          </View>
          <Text style={{ flex: 1, fontSize: 13, fontWeight: '500', color: theme.text.primary }}>
            {field.change}
          </Text>
        </Pressable>
      ) : null}
      <View style={{ flexDirection: 'row' }}>
        <TicketChip view={field.chip} />
      </View>
      {field.title ? (
        <Text numberOfLines={2} style={{ fontSize: 12, color: theme.text.secondary }}>
          {field.title}
        </Text>
      ) : null}
      {field.kind === 'unavailable' ? (
        <Text style={{ fontSize: 12, color: theme.text.muted }}>{field.text}</Text>
      ) : null}
    </View>
  )
}
