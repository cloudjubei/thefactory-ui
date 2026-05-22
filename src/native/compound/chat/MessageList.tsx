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
import type { UikitFileMeta } from '../files/FileDisplay'
import type {
  ChatMessageLike,
  ToolCallLike,
  ToolResultTypeLike,
} from '../../../headless/utils/chatTypes'
import { nativeLightTheme, nativeRadii, nativeShadows, nativeSpace } from '../../../tokens/native'

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

  onAtBottomChange?: (atBottom: boolean) => void
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
  onAtBottomChange,
  scrollToBottomSignal,
  onDeleteLastMessage,
  onRetry,
  renderToolCall,
  onResolveFile,
  renderDependency,
  thinkingLabel,
}: MessageListProps) {
  const scrollRef = useRef<RNScrollView>(null)
  const [atBottom, setAtBottom] = useState(true)
  const lastAtBottomRef = useRef(true)

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent
      const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height)
      const nextAtBottom = distanceFromBottom <= AT_BOTTOM_THRESHOLD
      if (nextAtBottom !== lastAtBottomRef.current) {
        lastAtBottomRef.current = nextAtBottom
        setAtBottom(nextAtBottom)
        onAtBottomChange?.(nextAtBottom)
      }
    },
    [onAtBottomChange],
  )

  // Auto-scroll to the bottom on chat changes, new messages while pinned to
  // the bottom, and any `scrollToBottomSignal` bump.
  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: false })
    lastAtBottomRef.current = true
    setAtBottom(true)
    onAtBottomChange?.(true)
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

  const renderable = useMemo(
    () => messages.filter((m) => !isEmptyAssistantMessage(m) || isToolMessage(m)),
    [messages],
  )

  // ---- Windowed pagination (newest-first "Load more") --------------------
  const [visibleCount, setVisibleCount] = useState(DEFAULT_VISIBLE)
  useEffect(() => {
    setVisibleCount(DEFAULT_VISIBLE)
  }, [chatId])
  const startIndex = Math.max(0, renderable.length - visibleCount)
  const windowed = useMemo(() => renderable.slice(startIndex), [renderable, startIndex])

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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Load older messages"
            onPress={() => setVisibleCount((c) => Math.min(renderable.length, c + BATCH_SIZE))}
            style={({ pressed }) => ({
              alignSelf: 'center',
              paddingHorizontal: nativeSpace[6],
              paddingVertical: nativeSpace[2],
              borderRadius: nativeRadii.round,
              borderWidth: 1,
              borderColor: nativeLightTheme.border.default,
              backgroundColor: pressed
                ? nativeLightTheme.surface.muted
                : nativeLightTheme.surface.overlay,
            })}
          >
            <Text style={{ fontSize: 12, color: nativeLightTheme.text.secondary }}>
              Load {Math.min(BATCH_SIZE, startIndex)} older
            </Text>
          </Pressable>
        )}
        {windowed.map((msg, i) => (
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
              thinkingLabel={thinkingLabel}
            />
          </View>
        ))}
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
            backgroundColor: nativeLightTheme.surface.overlay,
            borderWidth: 1,
            borderColor: nativeLightTheme.border.default,
            opacity: pressed ? 0.7 : 1,
            ...nativeShadows[2],
          })}
        >
          <Text style={{ fontSize: 12, color: nativeLightTheme.text.primary }}>
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
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[3] }}>
      <View style={{ flex: 1, height: 1, backgroundColor: nativeLightTheme.border.default }} />
      <Text
        style={{
          fontSize: 10,
          color: nativeLightTheme.text.muted,
          textAlign: 'center',
          maxWidth: '70%',
        }}
      >
        Context cut-off — messages below are sent
        {numberMessagesToSend ? ` (last ${numberMessagesToSend})` : ''}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: nativeLightTheme.border.default }} />
    </View>
  )
}
