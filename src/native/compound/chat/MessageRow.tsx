import { memo, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import RichText from '../files/RichText'
import Markdown from '../Markdown'
import FileDisplay, { type UikitFileMeta } from '../files/FileDisplay'
import type {
  ChatMessageLike,
  ToolCallLike,
  ToolResultTypeLike,
} from '../../../headless/utils/chatTypes'
import {
  nativeLightTheme,
  nativePalette,
  nativeRadii,
  nativeShadows,
  nativeSpace,
} from '../../../tokens/native'

function formatFriendlyTimestamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  })
}

function messageIso(m: ChatMessageLike): string | undefined {
  return m.completedAt ?? m.startedAt
}

export interface MessageRowProps {
  msg: ChatMessageLike & { showModel?: boolean; isFirstInGroup?: boolean }
  globalIndex: number
  totalMessages: number
  isThinking: boolean
  isLast: boolean
  prevUserMessagesLen: number
  enhancedTotalLength: number

  /** Render the tool-call card. RN's `ToolCallCard` peer isn't shipped yet —
   * pass a host renderer here to surface tool calls until it lands. */
  renderToolCall?: (args: {
    toolCall: ToolCallLike
    result?: unknown
    resultType?: ToolResultTypeLike
    durationMs?: number
  }) => ReactNode

  onDeleteLastMessage?: () => void
  onRetry?: () => void

  /** Resolve an `@<path>` inline file mention to file metadata. */
  onResolveFile?: (token: string) => UikitFileMeta | null
  /** Render an inline `#<id>` reference. */
  renderDependency?: (dep: string) => ReactNode

  thinkingLabel?: string
}

function Avatar({ kind }: { kind: 'user' | 'ai' | 'tool' }) {
  const isUser = kind === 'user'
  const isTool = kind === 'tool'
  const bg = isUser
    ? nativeLightTheme.accent.primary
    : isTool
      ? nativeLightTheme.surface.overlay
      : nativePalette.blue[50]
  const fg = isUser ? nativeLightTheme.text.inverted : nativeLightTheme.text.primary
  const label = isUser ? 'You' : isTool ? '🛠' : 'AI'
  return (
    <View
      accessibilityElementsHidden
      style={{
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: bg,
        borderWidth: isUser ? 0 : 1,
        borderColor: nativeLightTheme.border.subtle,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '600', color: fg }}>{label}</Text>
    </View>
  )
}

function MessageRow({
  msg,
  isLast,
  isThinking,
  renderToolCall,
  onDeleteLastMessage,
  onRetry,
  onResolveFile,
  renderDependency,
  thinkingLabel,
}: MessageRowProps) {
  const role = msg.role
  const isSystem = role === 'system'
  const isUser = role === 'user'
  const isAssistant = role === 'assistant'
  const isTool = role === 'tool' || !!msg.toolCall

  if (msg.error) {
    return (
      <View
        accessibilityRole="alert"
        style={{ flexDirection: 'row', alignItems: 'flex-start', gap: nativeSpace[3] }}
      >
        <Avatar kind="ai" />
        <View
          style={{
            flex: 1,
            maxWidth: '72%',
            minWidth: 80,
            paddingHorizontal: nativeSpace[6],
            paddingVertical: nativeSpace[4],
            borderRadius: nativeRadii[2],
            borderWidth: 1,
            borderColor: nativePalette.red[500],
            backgroundColor: nativePalette.red[50],
          }}
        >
          <Text style={{ fontSize: 14, color: nativePalette.red[700] }}>{String(msg.error)}</Text>
        </View>
        {onRetry && isLast && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry the last action"
            onPress={onRetry}
            disabled={isThinking}
            style={({ pressed }) => ({
              padding: nativeSpace[4],
              opacity: pressed ? 0.5 : isThinking ? 0.5 : 1,
            })}
          >
            <Text style={{ fontSize: 18, color: nativeLightTheme.text.secondary }}>↻</Text>
          </Pressable>
        )}
      </View>
    )
  }

  const iso = messageIso(msg)
  const ts = iso ? formatFriendlyTimestamp(iso) : ''
  const rawModel = msg.usage?.model ?? msg.model
  const modelLabel = typeof rawModel === 'string' ? rawModel : rawModel?.model
  const files = (msg as { files?: string[] }).files

  return (
    <View
      style={{
        flexDirection: isUser ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        gap: nativeSpace[3],
      }}
    >
      <View style={{ alignItems: 'center', gap: nativeSpace[2] }}>
        <Avatar kind={isUser ? 'user' : isTool ? 'tool' : 'ai'} />
        {onDeleteLastMessage && isLast && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete last message"
            onPress={onDeleteLastMessage}
            disabled={isThinking}
            hitSlop={4}
            style={({ pressed }) => ({
              width: 24,
              height: 24,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: nativeRadii[1],
              borderWidth: 1,
              borderColor: nativeLightTheme.border.subtle,
              backgroundColor: pressed
                ? nativeLightTheme.surface.muted
                : nativeLightTheme.surface.raised,
              opacity: isThinking ? 0.4 : 1,
            })}
          >
            <Text style={{ fontSize: 12, color: nativeLightTheme.text.secondary }}>🗑</Text>
          </Pressable>
        )}
      </View>

      <View
        style={{
          flex: 1,
          minWidth: 0,
          maxWidth: isUser ? '85%' : '100%',
          alignItems: isUser ? 'flex-end' : 'flex-start',
          gap: nativeSpace[2],
        }}
      >
        {isAssistant && (modelLabel || thinkingLabel || ts) && (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              width: '100%',
              gap: nativeSpace[3],
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
              {msg.showModel && modelLabel && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: nativeSpace[2],
                    paddingHorizontal: nativeSpace[5],
                    paddingVertical: 2,
                    borderRadius: nativeRadii.round,
                    borderWidth: 1,
                    borderColor: nativeLightTheme.border.subtle,
                    backgroundColor: nativeLightTheme.surface.overlay,
                  }}
                >
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: nativeLightTheme.accent.primary,
                    }}
                  />
                  <Text
                    numberOfLines={1}
                    style={{ fontSize: 11, color: nativeLightTheme.text.secondary }}
                  >
                    {modelLabel}
                  </Text>
                </View>
              )}
            </View>
            {(ts || thinkingLabel) && (
              <Text
                selectable={false}
                style={{ fontSize: 10, color: nativeLightTheme.text.secondary, opacity: 0.8 }}
              >
                {thinkingLabel ? `+${thinkingLabel}` : ''}
                {thinkingLabel && ts ? ' · ' : ''}
                {ts}
              </Text>
            )}
          </View>
        )}
        {!isAssistant && !isTool && ts && (
          <Text
            selectable={false}
            style={{ fontSize: 10, color: nativeLightTheme.text.secondary, opacity: 0.8 }}
          >
            {ts}
          </Text>
        )}

        {msg.content && !isTool && (
          <View
            style={[
              {
                paddingHorizontal: nativeSpace[6],
                paddingVertical: nativeSpace[4],
                borderRadius: nativeRadii[5],
                maxWidth: '100%',
                ...nativeShadows[1],
              },
              isUser
                ? {
                    backgroundColor: nativeLightTheme.accent.primary,
                    borderBottomRightRadius: nativeRadii[1],
                  }
                : isSystem
                  ? {
                      backgroundColor: nativeLightTheme.surface.overlay,
                      borderWidth: 1,
                      borderColor: nativeLightTheme.border.subtle,
                    }
                  : {
                      backgroundColor: nativeLightTheme.surface.raised,
                      borderWidth: 1,
                      borderColor: nativeLightTheme.border.subtle,
                      borderBottomLeftRadius: nativeRadii[1],
                    },
            ]}
          >
            {isUser ? (
              <RichText
                text={msg.content}
                onResolveFile={onResolveFile}
                renderDependency={renderDependency}
              />
            ) : (
              <Markdown text={msg.content} />
            )}
          </View>
        )}

        {isTool && msg.toolCall && (
          <View style={{ width: '100%' }}>
            {renderToolCall ? (
              renderToolCall({
                toolCall: msg.toolCall,
                result: msg.toolResult?.result,
                resultType: msg.toolResult?.type ?? (msg.error ? 'errored' : undefined),
                durationMs: msg.toolResult?.durationMs ?? msg.durationMs,
              })
            ) : (
              <View
                style={{
                  paddingHorizontal: nativeSpace[6],
                  paddingVertical: nativeSpace[4],
                  borderRadius: nativeRadii[2],
                  borderWidth: 1,
                  borderColor: nativeLightTheme.border.subtle,
                  backgroundColor: nativeLightTheme.surface.muted,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'Menlo',
                    fontSize: 12,
                    color: nativeLightTheme.text.primary,
                  }}
                >
                  {msg.toolCall.name}
                </Text>
              </View>
            )}
          </View>
        )}

        {isUser && Array.isArray(files) && files.length > 0 && (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: nativeSpace[2],
              justifyContent: 'flex-end',
              marginTop: nativeSpace[2],
            }}
          >
            {files.map((path, i) => {
              const name = path.split('/').pop() ?? path
              return (
                <FileDisplay
                  key={`att-${i}-${path}`}
                  file={{ name, absolutePath: path, relativePath: path }}
                  density="compact"
                />
              )
            })}
          </View>
        )}
      </View>
    </View>
  )
}

export default memo(MessageRow)
