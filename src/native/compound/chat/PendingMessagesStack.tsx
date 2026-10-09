import { attachmentDisplayName } from 'thefactory-tools/utils'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { IconClose, IconEdit, IconHourglass, IconPause } from '../../icons'
import { Button } from '../../primitives/Button'
import Tooltip from '../../primitives/Tooltip'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { pendingStackView } from '../../../headless/utils/chatDraft'
import { PENDING_STACK_TEXT } from '../../../headless/utils/chatDraftConstants'
import type { ChatPendingQueue } from '../../../headless/hooks/useChatComposer'

export interface PendingMessagesStackProps {
  queue: ChatPendingQueue
  /** A turn is running in this chat. */
  busy: boolean
}

/**
 * Native peer of the web stack: messages sent while the agent was busy, above
 * the composer. Touch has no hover, so what "Send now" does is spelled out
 * under the header rather than left to a tooltip.
 */
export default function PendingMessagesStack({ queue, busy }: PendingMessagesStackProps) {
  const { theme } = useNativeTheme()
  if (queue.items.length === 0) return null
  const view = pendingStackView({
    busy,
    paused: queue.paused,
    mode: queue.sendNowMode,
    count: queue.items.length,
  })
  const StatusIcon = queue.paused ? IconPause : IconHourglass
  return (
    <View
      accessibilityLabel="Pending messages"
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
        <StatusIcon size={14} color={theme.text.secondary} />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontSize: 12, color: theme.text.primary }}>
            {view.title} · {view.status}
          </Text>
          <Text numberOfLines={2} style={{ fontSize: 11, color: theme.text.muted }}>
            {view.sendHint}
          </Text>
        </View>
        <Button size="sm" variant="secondary" onPress={() => void queue.sendNow()}>
          {view.sendLabel}
        </Button>
      </View>
      <ScrollView style={{ maxHeight: 160 }} contentContainerStyle={{ gap: nativeSpace[2] }}>
        {queue.items.map((item) => (
          <View
            key={item.id}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: nativeSpace[2],
              borderWidth: 1,
              borderColor: theme.border.subtle,
              borderRadius: nativeRadii[2],
              backgroundColor: theme.surface.base,
              paddingHorizontal: nativeSpace[3],
              paddingVertical: nativeSpace[2],
            }}
          >
            <View style={{ flex: 1, gap: nativeSpace[1] }}>
              {item.text ? (
                <Text numberOfLines={2} style={{ fontSize: 13, color: theme.text.primary }}>
                  {item.text}
                </Text>
              ) : (
                <Text style={{ fontSize: 13, fontStyle: 'italic', color: theme.text.muted }}>
                  {PENDING_STACK_TEXT.attachmentsOnly}
                </Text>
              )}
              {item.attachments.length > 0 ? (
                <Text numberOfLines={1} style={{ fontSize: 11, color: theme.text.secondary }}>
                  {item.attachments.map((p) => attachmentDisplayName(p)).join(' · ')}
                </Text>
              ) : null}
            </View>
            <Tooltip content={PENDING_STACK_TEXT.edit}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit pending message"
                onPress={() => queue.edit(item.id)}
                hitSlop={6}
              >
                <IconEdit size={16} color={theme.text.secondary} />
              </Pressable>
            </Tooltip>
            <Tooltip content={PENDING_STACK_TEXT.remove}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remove pending message"
                onPress={() => queue.remove(item.id)}
                hitSlop={6}
              >
                <IconClose size={16} color={theme.text.secondary} />
              </Pressable>
            </Tooltip>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}
