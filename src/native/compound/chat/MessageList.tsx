import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
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

  onAtBottomChange?: (atBottom: boolean) => void
  /** Bump this number to scroll the list to the bottom (used right after the
   * user sends a message). */
  scrollToBottomSignal?: number

  onDeleteLastMessage?: () => void
  onRetry?: () => void

  /** Host renderer for a tool call until `ToolCallCard` ships a native peer. */
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

  const renderable = messages.filter((m) => !isEmptyAssistantMessage(m) || isToolMessage(m))
  const lastIndex = renderable.length - 1
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
        {renderable.map((msg, i) => (
          <MessageRow
            key={msg.id ?? `msg-${i}`}
            msg={msg}
            globalIndex={i}
            totalMessages={renderable.length}
            isThinking={isThinking}
            isLast={i === lastIndex}
            prevUserMessagesLen={prevUserCount}
            enhancedTotalLength={renderable.length}
            renderToolCall={renderToolCall}
            onDeleteLastMessage={onDeleteLastMessage}
            onRetry={onRetry}
            onResolveFile={onResolveFile}
            renderDependency={renderDependency}
            thinkingLabel={thinkingLabel}
          />
        ))}
        {pending && pending.content && (
          <MessageRow
            msg={{ role: pending.role, content: pending.content }}
            globalIndex={renderable.length}
            totalMessages={renderable.length + 1}
            isThinking={isThinking}
            isLast
            prevUserMessagesLen={prevUserCount}
            enhancedTotalLength={renderable.length + 1}
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
