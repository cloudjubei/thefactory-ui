import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import type { ChatContext } from 'thefactory-tools/types'

import {
  ASSISTANT_COPY,
  CHAT_LIST_COPY,
  CHAT_LIST_NOTICE_MS,
  formatFriendlyTimestamp,
  inkBadgeLook,
  useAppSettings,
  useChats,
  type AssistantRow,
  type InkBadgeLook,
} from '../../../headless'
import type { BadgeColor, BadgeColorCategory } from '../../../headless/types/settings'
import { CHAT_NOTIFY_MUTED_LABEL } from '../../../headless/utils/chatNotifyConstants'
import { INK_FRESH_DOT_COLOR } from '../../../headless/utils/inkBadgeConstants'
import { palette } from '../../../tokens/colors'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconBellOff, IconDotsVertical, IconPlus } from '../../icons'
import DotBadge from '../../primitives/DotBadge'
import { useToast } from '../../primitives/Toast'
import InkBadge from '../shell/InkBadge'

export interface AssistantConversationListProps {
  /** The conversations in the list, the one being started at the top. */
  conversations: readonly AssistantRow[]
  /** The conversations archived from the list. */
  archived: readonly AssistantRow[]
  /** The conversation on screen, highlighted. */
  activeKey?: string
  onOpen: (context: ChatContext) => void
  /** Starts a new conversation. */
  onNew: () => void
}

/**
 * Native peer of web's `AssistantConversationList`: the same rows, ⋯ to the
 * archived conversations and back, + for a new one, drawn for touch.
 */
export default function AssistantConversationList({
  conversations,
  archived,
  activeKey,
  onOpen,
  onNew,
}: AssistantConversationListProps) {
  const { theme } = useNativeTheme()
  const { chatListNotice, dismissChatListNotice, showChatInList } = useChats()
  const { settings } = useAppSettings()
  const { toast } = useToast()
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => {
    if (!chatListNotice) return
    const undo = chatListNotice.undo
    toast({
      description: chatListNotice.text,
      durationMs: CHAT_LIST_NOTICE_MS,
      ...(undo
        ? { action: { label: CHAT_LIST_COPY.undo, onClick: () => void showChatInList(undo) } }
        : {}),
    })
    dismissChatListNotice()
  }, [chatListNotice, dismissChatListNotice, showChatInList, toast])

  const rows = showArchived ? archived : conversations
  const toggleLabel = showArchived
    ? ASSISTANT_COPY.backToConversations
    : ASSISTANT_COPY.showArchived
  const look = inkBadgeLook(settings.userPreferences)
  const badgeColors = settings.notifications.badgeColors

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: nativeSpace[2],
          paddingHorizontal: nativeSpace[4],
          paddingVertical: nativeSpace[3],
        }}
      >
        <Text
          numberOfLines={1}
          style={{ flex: 1, fontSize: 15, fontWeight: '600', color: theme.text.primary }}
        >
          {showArchived ? ASSISTANT_COPY.archived : ASSISTANT_COPY.conversations}
        </Text>
        <Pressable
          onPress={() => setShowArchived((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={`${toggleLabel} (${archived.length})`}
          accessibilityState={{ selected: showArchived }}
          hitSlop={8}
          style={{ padding: nativeSpace[2] }}
        >
          <View style={{ transform: [{ rotate: '90deg' }] }}>
            <IconDotsVertical size={18} color={theme.text.secondary} />
          </View>
        </Pressable>
        <Pressable
          onPress={() => {
            setShowArchived(false)
            onNew()
          }}
          accessibilityRole="button"
          accessibilityLabel={ASSISTANT_COPY.newConversation}
          hitSlop={8}
          style={{
            padding: nativeSpace[2],
            borderRadius: 8,
            borderWidth: 1,
            borderColor: theme.border.default,
          }}
        >
          <IconPlus size={16} color={theme.text.secondary} />
        </Pressable>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: nativeSpace[3], paddingBottom: nativeSpace[8] }}
      >
        {rows.map((row) => (
          <AssistantConversationRow
            key={row.key}
            row={row}
            active={row.key === activeKey}
            look={look}
            badgeColors={badgeColors}
            onOpen={onOpen}
          />
        ))}
        {rows.length === 0 ? (
          <Text
            style={{
              paddingHorizontal: nativeSpace[6],
              paddingVertical: nativeSpace[10],
              textAlign: 'center',
              fontSize: 13,
              lineHeight: 20,
              color: theme.text.secondary,
            }}
          >
            {showArchived ? ASSISTANT_COPY.archivedEmpty : ASSISTANT_COPY.empty}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  )
}

function AssistantConversationRow({
  row,
  active,
  look,
  badgeColors,
  onOpen,
}: {
  row: AssistantRow
  active: boolean
  look: InkBadgeLook
  badgeColors: Readonly<Record<BadgeColorCategory, BadgeColor>>
  onOpen: (context: ChatContext) => void
}) {
  const { theme } = useNativeTheme()
  const loud = row.needsYou > 0 || row.fresh
  const badgeLabel = [
    row.needsYou > 0 ? `${ASSISTANT_COPY.needsYou}: ${row.needsYou}` : '',
    row.running ? ASSISTANT_COPY.running : '',
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <Pressable
      onPress={() => onOpen(row.context)}
      accessibilityRole="button"
      accessibilityLabel={row.title}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => ({
        gap: 2,
        paddingHorizontal: nativeSpace[4],
        paddingVertical: nativeSpace[3],
        borderRadius: 9,
        borderWidth: 1,
        borderColor: active ? palette.brand[200] : 'transparent',
        backgroundColor: active
          ? `${palette.brand[500]}1f`
          : pressed
            ? theme.surface.hover
            : 'transparent',
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontSize: 13.5,
            fontWeight: loud ? '600' : '500',
            color: theme.text.primary,
          }}
        >
          {row.title}
        </Text>
        {row.needsYou > 0 || row.running ? (
          <InkBadge
            badge={{
              parts: row.needsYou > 0 ? [{ channel: 'chat', count: row.needsYou }] : [],
              ...(row.running ? { running: 'chat' as const } : {}),
              rollup: false,
            }}
            look={look}
            badgeColors={badgeColors}
            label={badgeLabel}
          />
        ) : null}
        {row.fresh ? (
          <View accessible accessibilityLabel={ASSISTANT_COPY.fresh}>
            <DotBadge size={8} color={INK_FRESH_DOT_COLOR} ringWidth={0} />
          </View>
        ) : null}
        {row.muted ? (
          <View accessible accessibilityRole="image" accessibilityLabel={CHAT_NOTIFY_MUTED_LABEL}>
            <IconBellOff size={14} color={theme.text.secondary} />
          </View>
        ) : null}
      </View>
      <Text style={{ fontSize: 12, color: theme.text.secondary }}>
        {row.at ? formatFriendlyTimestamp(row.at) : ASSISTANT_COPY.justNow}
      </Text>
    </Pressable>
  )
}
