import { ScrollView, Text, View } from 'react-native'
import { IconHourglass } from '../../icons'
import { Button } from '../../primitives/Button'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { HELD_STACK_TEXT } from '../../../headless/utils/heldAgentMessagesConstants'
import type { UseHeldAgentMessages } from '../../../headless/hooks/useHeldAgentMessages'

export interface HeldAgentMessagesStackProps {
  held: UseHeldAgentMessages
}

/**
 * Native peer of the web stack: messages other agents sent this chat while it
 * was busy, held until it is free, above the composer or the approval the chat
 * waits on. Each can be delivered now or dropped.
 */
export default function HeldAgentMessagesStack({ held }: HeldAgentMessagesStackProps) {
  const { theme } = useNativeTheme()
  if (held.items.length === 0) return null
  const busy = held.workingId !== undefined
  return (
    <View
      accessibilityLabel={HELD_STACK_TEXT.title}
      style={{
        gap: nativeSpace[2],
        borderTopWidth: 1,
        borderTopColor: theme.border.subtle,
        backgroundColor: theme.surface.raised,
        paddingHorizontal: nativeSpace[5],
        paddingTop: nativeSpace[3],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
        <IconHourglass size={14} color={theme.text.secondary} />
        <Text style={{ fontSize: 12, color: theme.text.primary }}>{HELD_STACK_TEXT.title}</Text>
      </View>
      <ScrollView style={{ maxHeight: 200 }} contentContainerStyle={{ gap: nativeSpace[2] }}>
        {held.items.map((item) => (
          <View
            key={item.id}
            style={{
              gap: nativeSpace[2],
              borderWidth: 1,
              borderColor: theme.border.subtle,
              borderRadius: nativeRadii[2],
              backgroundColor: theme.surface.base,
              paddingHorizontal: nativeSpace[3],
              paddingVertical: nativeSpace[2],
            }}
          >
            <Text style={{ fontSize: 11, color: theme.text.secondary }}>
              {HELD_STACK_TEXT.from} {item.from} · {item.waitingFor}
            </Text>
            <Text numberOfLines={3} style={{ fontSize: 13, color: theme.text.primary }}>
              {item.body}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[2] }}>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onPress={() => void held.discard(item.id)}
              >
                {HELD_STACK_TEXT.discard}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onPress={() => void held.deliverNow(item.id)}
              >
                {HELD_STACK_TEXT.deliverNow}
              </Button>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}
