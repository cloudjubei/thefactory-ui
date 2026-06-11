import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView as RNScrollView,
} from 'react-native'
import SystemPromptBubble from './SystemPromptBubble'
import ThinkingRow from './ThinkingRow'
import MessageRow from './MessageRow'
import { formatDurationMs } from '../../../headless'
import type { UikitFileMeta } from '../files/FileDisplay'
import type {
  ChatMessageLike,
  ToolCallLike,
  ToolResultTypeLike,
} from '../../../headless/utils/chatTypes'
import { nativeRadii, nativeShadows, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

const AT_BOTTOM_THRESHOLD = 32
const DEFAULT_VISIBLE = 30
const BATCH_SIZE = 30

function isToolMessage(msg: ChatMessageLike): boolean {
  return msg.role === 'tool' || !!msg.toolCall
}

function isEmptyAssistantMessage(msg: ChatMessageLike): boolean {
  if (msg.role !== 'assistant') return false
  return !msg.content || msg.content.trim().length === 0
}

function messageIso(m: ChatMessageLike): string | undefined {
  return m.completedAt ?? m.startedAt
}

export interface MessageListProps {
  /** Stable identifier — when it changes, the list resets scroll position. */
  chatId?: string
  messages: ChatMessageLike[]
  isThinking?: boolean
  /** Streaming-pending assistant turn rendered as the last bubble. */
  pending?: { role: 'user' | 'assistant'; content: string } | null
  /** Optional system prompt rendered above the message list. */
  systemPrompt?: string
  systemPromptTimestamp?: string

  /** When set, draws a "context cut-off" divider above the oldest message
   *  that will still be included in the next request. */
  numberMessagesToSend?: number

  /** Last-read message timestamp. When set and the chat has newer messages,
   *  the list opens positioned at the first unread message (with a divider)
   *  instead of at the bottom. */
  lastReadIso?: string

  onAtBottomChange?: (atBottom: boolean) => void
  /** Fired with the ISO timestamp of the latest message visible at the
   * bottom of the list — used by the host to advance per-chat read cursors
   * as the user scrolls. Web peer fires this on every scroll event; the RN
   * surface fires it whenever the at-bottom state flips to true (mobile has
   * no per-row visibility tracking yet). */
  onReadLatest?: (iso?: string) => void
  /** Bump this number to scroll the list to the bottom (used right after the
   * user sends a message). */
  scrollToBottomSignal?: number

  onDeleteLastMessage?: () => void
  onRetry?: () => void

  /** Host renderer for a tool call. */
  renderToolCall?: (args: {
    toolCall: ToolCallLike
    result?: unknown
    resultType?: ToolResultTypeLike
    durationMs?: number
  }) => ReactNode

  onResolveFile?: (token: string) => UikitFileMeta | null
  renderDependency?: (dep: string) => ReactNode
  /** Render the workspace-diff panel for a CLI-agent reply. Forwarded to MessageRow. */
  renderCliRunArtifact?: (runId: string) => ReactNode

  /** Forwards to `MessageRow.onShowUsage`. */
  onShowUsage?: (msg: ChatMessageLike) => void

  thinkingLabel?: string
}

export default function MessageList({
  chatId,
  messages,
  isThinking = false,
  pending,
  systemPrompt,
  systemPromptTimestamp,
  numberMessagesToSend,
  lastReadIso,
  onAtBottomChange,
  onReadLatest,
  scrollToBottomSignal,
  onDeleteLastMessage,
  onRetry,
  renderToolCall,
  onResolveFile,
  renderDependency,
  renderCliRunArtifact,
  onShowUsage,
  thinkingLabel,
}: MessageListProps) {
  const { theme } = useNativeTheme()
  const scrollRef = useRef<RNScrollView>(null)
  const [atBottom, setAtBottom] = useState(true)
  const lastAtBottomRef = useRef(true)
  // First-unread positioning: the y-offset of the unread divider, the chat
  // we've already positioned, and the current first-unread window index
  // (mirrored into a ref so the chatId effect can read it without a dep).
  const anchorYRef = useRef<number | null>(null)
  const positionedChatRef = useRef<string | undefined>(undefined)
  const firstUnreadRef = useRef<number | null>(null)

  // Latest message iso — kept in a ref so onScroll can fire `onReadLatest`
  // without re-binding on every render.
  const latestIsoRef = useRef<string | undefined>(undefined)

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent
      const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height)
      const nextAtBottom = distanceFromBottom <= AT_BOTTOM_THRESHOLD
      if (nextAtBottom !== lastAtBottomRef.current) {
        lastAtBottomRef.current = nextAtBottom
        setAtBottom(nextAtBottom)
        onAtBottomChange?.(nextAtBottom)
        if (nextAtBottom) onReadLatest?.(latestIsoRef.current)
      }
    },
    [onAtBottomChange, onReadLatest],
  )

  // On chat change: open at the first unread message when there is one
  // (the unread anchor's `onLayout` does the scroll); otherwise open pinned
  // to the bottom.
  useEffect(() => {
    positionedChatRef.current = undefined
    anchorYRef.current = null
    const hasUnread = firstUnreadRef.current != null
    if (!hasUnread) {
      scrollRef.current?.scrollToEnd({ animated: false })
    }
    lastAtBottomRef.current = !hasUnread
    setAtBottom(!hasUnread)
    onAtBottomChange?.(!hasUnread)
  }, [chatId, onAtBottomChange])

  useEffect(() => {
    if (lastAtBottomRef.current) {
      scrollRef.current?.scrollToEnd({ animated: true })
    }
  }, [messages.length, pending?.content])

  useEffect(() => {
    if (scrollToBottomSignal === undefined) return
    scrollRef.current?.scrollToEnd({ animated: true })
  }, [scrollToBottomSignal])

  // No filtering — web renders empty-content assistant messages so the
  // user can see the model + cost + time row that precedes a group of
  // tool calls. The mobile previously dropped these for "noise"; the user
  // explicitly wants parity here.
  const renderable = useMemo(() => messages, [messages])

  // Latest message iso (excluding empty-assistant filler) — drives the
  // `onReadLatest` callback. Recompute whenever the message list changes.
  useEffect(() => {
    for (let i = renderable.length - 1; i >= 0; i--) {
      const iso = messageIso(renderable[i])
      if (iso) {
        latestIsoRef.current = iso
        return
      }
    }
    latestIsoRef.current = undefined
  }, [renderable])

  // ---- Windowed pagination (newest-first "Load more") --------------------
  const [visibleCount, setVisibleCount] = useState(DEFAULT_VISIBLE)
  useEffect(() => {
    setVisibleCount(DEFAULT_VISIBLE)
  }, [chatId])
  const startIndex = Math.max(0, renderable.length - visibleCount)
  const windowed = useMemo(() => renderable.slice(startIndex), [renderable, startIndex])

  // ---- First-unread positioning ------------------------------------------
  const firstUnreadInWindow = useMemo(() => {
    if (!lastReadIso) return null
    for (let i = 0; i < windowed.length; i++) {
      const iso = messageIso(windowed[i])
      if (iso && iso > lastReadIso) return i
    }
    return null
  }, [windowed, lastReadIso])
  firstUnreadRef.current = firstUnreadInWindow

  /** Scroll to the unread divider once per chat, after it has laid out. */
  const positionToUnread = useCallback(() => {
    if (positionedChatRef.current === chatId) return
    if (firstUnreadRef.current == null || anchorYRef.current == null) return
    positionedChatRef.current = chatId
    scrollRef.current?.scrollTo({ y: Math.max(0, anchorYRef.current - 12), animated: false })
  }, [chatId])

  // ---- Context cut-off divider -------------------------------------------
  const cutoffIndex = useMemo(() => {
    if (!numberMessagesToSend || numberMessagesToSend < 1) return null
    const total = renderable.length
    if (total <= numberMessagesToSend) return null
    let totalCount = 0
    let logicalCount = 0
    let isInGroup = false
    for (let i = total - 1; i > 0; i--) {
      const m = renderable[i]
      if (!(isToolMessage(m) || isEmptyAssistantMessage(m))) {
        if (logicalCount >= numberMessagesToSend) break
        isInGroup = false
        logicalCount++
      } else {
        if (!isInGroup) {
          if (logicalCount >= numberMessagesToSend) break
          logicalCount++
        }
        isInGroup = true
      }
      totalCount++
    }
    return total - totalCount
  }, [renderable, numberMessagesToSend])
  const cutoffIndexInWindow =
    cutoffIndex === null ? null : cutoffIndex - startIndex >= 0 ? cutoffIndex - startIndex : null

  const lastIndex = windowed.length - 1
  const prevUserCount = renderable.filter((m) => m.role === 'user').length

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          padding: nativeSpace[6],
          gap: nativeSpace[6],
        }}
      >
        {systemPrompt && (
          <SystemPromptBubble content={systemPrompt} timestamp={systemPromptTimestamp} />
        )}
        {startIndex > 0 && (
          // Single tappable chip — label + load action in one affordance.
          // Mirrors web's `MessageList` older-messages pill.
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${startIndex} older messages hidden — tap to load`}
            onPress={() => setVisibleCount((c) => Math.min(renderable.length, c + BATCH_SIZE))}
            style={({ pressed }) => ({
              alignSelf: 'center',
              paddingHorizontal: nativeSpace[6],
              paddingVertical: nativeSpace[2],
              borderRadius: nativeRadii.round,
              borderWidth: 1,
              borderColor: theme.border.default,
              backgroundColor: pressed
                ? theme.surface.muted
                : theme.surface.overlay,
            })}
          >
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>
              {startIndex} older message{startIndex === 1 ? '' : 's'} hidden — click to load
            </Text>
          </Pressable>
        )}
        {windowed.map((msg, i) => {
          // Per-message thinking label = time between this assistant
          // message's iso and the previous message's iso, formatted as
          // `+X ms` / `+X s`. Mirrors web's `MessageList.thinkingLabel`
          // computation so the prefix appears next to each assistant
          // bubble's timestamp on every client.
          const prevIso = i > 0 ? messageIso(windowed[i - 1]) : undefined
          const curIso = messageIso(msg)
          const perMsgThinking =
            msg.role === 'assistant' && prevIso && curIso
              ? formatDurationMs(new Date(curIso).getTime() - new Date(prevIso).getTime())
              : undefined
          const row = (
            <View key={msg.id ?? `msg-${startIndex + i}`} style={{ gap: nativeSpace[6] }}>
              {cutoffIndexInWindow === i ? (
                <CutoffDivider numberMessagesToSend={numberMessagesToSend} />
              ) : null}
              <MessageRow
                msg={msg}
                globalIndex={i}
                totalMessages={windowed.length}
                isThinking={isThinking}
                isLast={i === lastIndex}
                prevUserMessagesLen={prevUserCount}
                enhancedTotalLength={windowed.length}
                renderToolCall={renderToolCall}
                onDeleteLastMessage={onDeleteLastMessage}
                onRetry={onRetry}
                onResolveFile={onResolveFile}
                renderDependency={renderDependency}
                renderCliRunArtifact={renderCliRunArtifact}
                onShowUsage={onShowUsage}
                thinkingLabel={perMsgThinking}
              />
            </View>
          )
          if (i !== firstUnreadInWindow) return row
          return [
            <View
              key="unread-anchor"
              onLayout={(e) => {
                anchorYRef.current = e.nativeEvent.layout.y
                positionToUnread()
              }}
            >
              <UnreadDivider />
            </View>,
            row,
          ]
        })}
        {pending && pending.content && (
          <MessageRow
            msg={{ role: pending.role, content: pending.content }}
            globalIndex={windowed.length}
            totalMessages={windowed.length + 1}
            isThinking={isThinking}
            isLast
            prevUserMessagesLen={prevUserCount}
            enhancedTotalLength={windowed.length + 1}
            onResolveFile={onResolveFile}
            renderDependency={renderDependency}
            thinkingLabel={thinkingLabel}
          />
        )}
        {isThinking && (!pending || !pending.content) && (
          <ThinkingRow label={thinkingLabel ?? 'Thinking'} />
        )}
      </ScrollView>
      {!atBottom && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Scroll to latest"
          onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}
          style={({ pressed }) => ({
            position: 'absolute',
            bottom: nativeSpace[6],
            alignSelf: 'center',
            paddingHorizontal: nativeSpace[6],
            paddingVertical: nativeSpace[3],
            borderRadius: nativeRadii.round,
            backgroundColor: theme.surface.overlay,
            borderWidth: 1,
            borderColor: theme.border.default,
            opacity: pressed ? 0.7 : 1,
            ...nativeShadows[2],
          })}
        >
          <Text style={{ fontSize: 12, color: theme.text.primary }}>
            ↓ Scroll to latest
          </Text>
        </Pressable>
      )}
    </View>
  )
}

/** "Context cut-off" divider — messages above it are dropped from the next
 *  request given the chat's `numberMessagesToSend` setting. */
function CutoffDivider({ numberMessagesToSend }: { numberMessagesToSend?: number }) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[3] }}>
      <View style={{ flex: 1, height: 1, backgroundColor: theme.border.default }} />
      <Text
        style={{
          fontSize: 10,
          color: theme.text.muted,
          textAlign: 'center',
          maxWidth: '70%',
        }}
      >
        Context cut-off — messages below are sent
        {numberMessagesToSend ? ` (last ${numberMessagesToSend})` : ''}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: theme.border.default }} />
    </View>
  )
}

/** "New messages" divider — marks where the first unread message starts. */
function UnreadDivider() {
  const { theme } = useNativeTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[3] }}>
      <View style={{ flex: 1, height: 1, backgroundColor: theme.accent.primary }} />
      <Text
        style={{
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          color: theme.accent.primary,
        }}
      >
        New messages
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: theme.accent.primary }} />
    </View>
  )
}
