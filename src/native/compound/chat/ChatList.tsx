import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import type { ChatContext } from 'thefactory-tools/types'

import {
  CHAT_LIST_COPY,
  CHAT_LIST_EMPTY,
  CHAT_LIST_FILTERS,
  CHAT_LIST_NOTICE_MS,
  chatListFilterCounts,
  chatListPool,
  chatListSections,
  inkBadgeLook,
  useAppSettings,
  useChatList,
  useChats,
  type ChatListFilter,
  type ChatListRow,
  type ChatListScope,
  type ChatListSection,
  type ChatsSeenMap,
  type InkBadgeLook,
} from '../../../headless'
import type { BadgeColor, BadgeColorCategory } from '../../../headless/types/settings'
import { INK_FRESH_DOT_COLOR } from '../../../headless/utils/inkBadgeConstants'
import { palette } from '../../../tokens/colors'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { CHAT_NOTIFY_MUTED_LABEL } from '../../../headless/utils/chatNotifyConstants'
import { IconBellOff, IconDotsVertical } from '../../icons'
import DotBadge from '../../primitives/DotBadge'
import { useToast } from '../../primitives/Toast'
import ActionMenu from '../ActionMenu'
import ToneBadge from '../chips/ToneBadge'
import { renderProjectIcon } from '../projectIcons'
import InkBadge from '../shell/InkBadge'
import ChatKindTile from './ChatKindTile'

export interface ChatListProps {
  scope: ChatListScope
  /** The host's read-state map — what each chat was last seen at. */
  seen: ChatsSeenMap
  onOpen: (context: ChatContext) => void
  /** The chat on screen, highlighted. */
  activeKey?: string
}

/**
 * Native peer of web's `ChatList`: the same rows, filter chips, ⋯ → archived
 * chats and group sections, drawn for touch. The screen's own header carries
 * the title and the new-chat button.
 */
export default function ChatList({ scope, seen, onOpen, activeKey }: ChatListProps) {
  const { theme } = useNativeTheme()
  const rows = useChatList(scope, seen)
  const { chatListNotice, dismissChatListNotice, showChatInList } = useChats()
  const { settings } = useAppSettings()
  const { toast } = useToast()
  const [filter, setFilter] = useState<ChatListFilter>('all')
  const [archived, setArchived] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

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

  const sections = useMemo(
    () => chatListSections({ rows, scope, filter, archived }),
    [rows, scope, filter, archived],
  )
  const counts = useMemo(
    () => chatListFilterCounts(chatListPool(rows, scope, false)),
    [rows, scope],
  )
  const archivedCount = useMemo(() => chatListPool(rows, scope, true).length, [rows, scope])
  const look = inkBadgeLook(settings.userPreferences)
  const badgeColors = settings.notifications.badgeColors
  const empty = sections.every((s) => s.rows.length === 0)
  const sectionColor: Record<NonNullable<ChatListSection['tone']>, string> = {
    neutral: theme.text.secondary,
    'needs-you': palette.brand[700],
    running: palette.green[800],
  }

  return (
    <View style={{ flex: 1 }}>
      {archived ? (
        <Text
          style={{
            paddingHorizontal: nativeSpace[4],
            paddingTop: nativeSpace[4],
            fontSize: 15,
            fontWeight: '600',
            color: theme.text.primary,
          }}
        >
          {CHAT_LIST_COPY.archivedTitle}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: nativeSpace[3],
          paddingHorizontal: nativeSpace[4],
          paddingVertical: nativeSpace[3],
        }}
      >
        {archived
          ? null
          : CHAT_LIST_FILTERS.map((f) => (
              <FilterChip
                key={f.id}
                label={f.label}
                count={f.id === 'all' ? 0 : counts[f.id]}
                pressed={filter === f.id}
                accent={f.id === 'needs-you'}
                onPick={() => setFilter(f.id)}
              />
            ))}
        <Pressable
          onPress={() => setMenuOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={CHAT_LIST_COPY.moreOptions}
          hitSlop={8}
          style={{ marginLeft: 'auto', padding: nativeSpace[2] }}
        >
          <View style={{ transform: [{ rotate: '90deg' }] }}>
            <IconDotsVertical size={18} color={theme.text.secondary} />
          </View>
        </Pressable>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: nativeSpace[3], paddingBottom: nativeSpace[8] }}
      >
        {sections.map((section) =>
          section.rows.length === 0 ? null : (
            <View key={section.id} style={{ gap: 1 }}>
              {section.label ? (
                <Text
                  style={{
                    paddingHorizontal: nativeSpace[3],
                    paddingTop: nativeSpace[5],
                    paddingBottom: nativeSpace[2],
                    fontSize: 10,
                    fontWeight: '600',
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                    color: sectionColor[section.tone ?? 'neutral'],
                  }}
                >
                  {section.label}
                </Text>
              ) : null}
              {section.rows.map((row) => (
                <ChatListRowPressable
                  key={row.key}
                  row={row}
                  active={row.key === activeKey}
                  showProject={scope.kind === 'group' && row.kind !== 'group'}
                  look={look}
                  badgeColors={badgeColors}
                  onOpen={onOpen}
                />
              ))}
            </View>
          ),
        )}
        {empty ? (
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
            {archived ? CHAT_LIST_COPY.archivedEmpty : CHAT_LIST_EMPTY[filter]}
          </Text>
        ) : null}
      </ScrollView>
      <ActionMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        actions={[
          archived
            ? {
                key: 'current',
                label: CHAT_LIST_COPY.backToCurrent,
                onPress: () => {
                  setMenuOpen(false)
                  setArchived(false)
                },
              }
            : {
                key: 'archived',
                label: CHAT_LIST_COPY.showArchived,
                hint: String(archivedCount),
                onPress: () => {
                  setMenuOpen(false)
                  setArchived(true)
                },
              },
        ]}
      />
    </View>
  )
}

function FilterChip({
  label,
  count,
  pressed,
  accent,
  onPick,
}: {
  label: string
  count: number
  pressed: boolean
  accent: boolean
  onPick: () => void
}) {
  const { theme } = useNativeTheme()
  const look = accent
    ? pressed
      ? { bg: palette.brand[600], fg: '#ffffff', border: palette.brand[600] }
      : { bg: palette.brand[50], fg: palette.brand[700], border: palette.brand[200] }
    : pressed
      ? { bg: theme.text.primary, fg: theme.surface.base, border: theme.text.primary }
      : { bg: theme.surface.raised, fg: theme.text.secondary, border: theme.border.default }
  return (
    <Pressable
      onPress={onPick}
      accessibilityRole="button"
      accessibilityState={{ selected: pressed }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: nativeSpace[2],
        borderRadius: 999,
        borderWidth: 1,
        borderColor: look.border,
        backgroundColor: look.bg,
        paddingHorizontal: nativeSpace[4],
        paddingVertical: nativeSpace[2],
      }}
    >
      <Text style={{ fontSize: 12.5, color: look.fg }}>{label}</Text>
      {count > 0 ? (
        <Text style={{ fontSize: 11, fontWeight: '700', color: look.fg }}>{count}</Text>
      ) : null}
    </Pressable>
  )
}

function ChatListRowPressable({
  row,
  active,
  showProject,
  look,
  badgeColors,
  onOpen,
}: {
  row: ChatListRow
  active: boolean
  showProject: boolean
  look: InkBadgeLook
  badgeColors: Readonly<Record<BadgeColorCategory, BadgeColor>>
  onOpen: (context: ChatContext) => void
}) {
  const { theme } = useNativeTheme()
  const loud = row.needsYou > 0 || row.fresh
  const badgeLabel = [
    row.needsYou > 0 ? `${CHAT_LIST_COPY.needsYou}: ${row.needsYou}` : '',
    row.running ? CHAT_LIST_COPY.running : '',
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
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: nativeSpace[4],
        padding: nativeSpace[3],
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
      <ChatKindTile kind={row.kind} label={row.kindLabel} size="sm" />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
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
                ...(row.running ? { running: row.runningChannel } : {}),
                rollup: false,
              }}
              look={look}
              badgeColors={badgeColors}
              label={badgeLabel}
            />
          ) : null}
          {row.fresh ? (
            <View accessible accessibilityLabel={CHAT_LIST_COPY.fresh}>
              <DotBadge size={8} color={INK_FRESH_DOT_COLOR} ringWidth={0} />
            </View>
          ) : null}
          {row.muted ? (
            <View accessible accessibilityRole="image" accessibilityLabel={CHAT_NOTIFY_MUTED_LABEL}>
              <IconBellOff size={14} color={theme.text.secondary} />
            </View>
          ) : null}
        </View>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2], minWidth: 0 }}
        >
          {showProject && row.projectName ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[1] }}>
              {renderProjectIcon(row.projectIcon ?? 'folder', 12, theme.text.secondary)}
              <Text style={{ fontSize: 12, color: theme.text.secondary }}>{row.projectName}</Text>
            </View>
          ) : null}
          {row.pill ? <ToneBadge tone={row.pill.tone} label={row.pill.label} /> : null}
          <Text
            numberOfLines={1}
            style={{ flexShrink: 1, fontSize: 12, color: theme.text.secondary }}
          >
            {row.sub}
          </Text>
        </View>
      </View>
    </Pressable>
  )
}
