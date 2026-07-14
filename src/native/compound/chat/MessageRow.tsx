import { memo, useState, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import RichText from '../files/RichText'
import Markdown from '../Markdown'
import type { ResourceLink } from 'thefactory-tools/types'
import FileDisplay, { type UikitFileMeta } from '../files/FileDisplay'
import { IconDelete, IconToolbox } from '../../icons'
import type {
  ChatMessageLike,
  ToolCallLike,
  ToolResultTypeLike,
} from '../../../headless/utils/chatTypes'
import { nativePalette, nativeRadii, nativeShadows, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import {
  cliDotColor,
  cliLabel,
  parseCliAgentModelTag,
  shortCliModelLabel,
} from '../../../headless/utils/cliRunner'

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

/**
 * Native peer of web's `CollapsibleContent`. Clips children to `maxHeight`
 * via `overflow: 'hidden'` and shows a "Show more / less" toggle if the
 * natural content height exceeds the cap. Natural height is captured via
 * `onLayout` on an inner wrapper whose own layout is unconstrained by the
 * parent's `maxHeight` clip.
 */
function CollapsibleContent({
  children,
  maxHeight = 600,
}: {
  children: ReactNode
  maxHeight?: number
}) {
  const { theme } = useNativeTheme()
  const [naturalHeight, setNaturalHeight] = useState<number | null>(null)
  const [expanded, setExpanded] = useState(false)
  const needsCollapse = naturalHeight !== null && naturalHeight > maxHeight + 8
  return (
    <View>
      <View
        style={{
          overflow: 'hidden',
          maxHeight: expanded || !needsCollapse ? undefined : maxHeight,
        }}
      >
        <View
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height
            if (h > 0) setNaturalHeight(h)
          }}
        >
          {children}
        </View>
      </View>
      {needsCollapse ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Show less' : 'Show more'}
          onPress={() => setExpanded((v) => !v)}
          style={({ pressed }) => ({
            alignSelf: 'flex-end',
            marginTop: nativeSpace[2],
            paddingHorizontal: nativeSpace[3],
            paddingVertical: nativeSpace[2],
            borderRadius: nativeRadii[2],
            borderWidth: 1,
            borderColor: theme.border.subtle,
            backgroundColor: pressed ? theme.surface.muted : theme.surface.overlay,
          })}
        >
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>
            {expanded ? 'Show less' : 'Show more'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}

/**
 * Compact per-message usage chip — pressable. Just shows `$` (matches web).
 * Web reveals the full token breakdown in a hover tooltip; touch has no
 * hover, so on tap the host opens a `MessageUsageSheet` with the full
 * breakdown.
 */
function UsageChip({ msg, onPress }: { msg: ChatMessageLike; onPress?: () => void }) {
  const { theme } = useNativeTheme()
  if (!msg.usage) return null
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      hitSlop={6}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? 'View message usage details' : undefined}
    >
      <View
        // Bumped padding so the `$` chip matches the model chip's height
        // (4px vert + 6px horiz = ~22-24px tall) and sits visually centred
        // with the AI avatar. Matches web's chip dimensions.
        style={{
          paddingHorizontal: 6,
          paddingVertical: 3,
          borderRadius: nativeRadii.round,
          borderWidth: 1,
          borderColor: theme.border.subtle,
          backgroundColor: theme.surface.overlay,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: '600',
            color: theme.text.secondary,
          }}
        >
          $
        </Text>
      </View>
    </Pressable>
  )
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
  /** Route an in-app `overseer://…` resource link the assistant emitted (F.2). */
  onResourceLink?: (link: ResourceLink) => void
  /** Render the workspace-diff panel for a CLI-agent reply (`msg.cliRunId`). */
  renderCliRunArtifact?: (runId: string) => ReactNode

  /**
   * Fired when the user taps the per-message usage `$` chip. The host
   * opens a `MessageUsageSheet` with the full breakdown — the native
   * analogue of web's hover-revealed usage tooltip.
   */
  onShowUsage?: (msg: ChatMessageLike) => void

  thinkingLabel?: string
}

function Avatar({ kind }: { kind: 'user' | 'ai' | 'tool' }) {
  const { theme } = useNativeTheme()
  const isUser = kind === 'user'
  const isTool = kind === 'tool'
  const bg = isUser ? theme.accent.primary : isTool ? theme.surface.overlay : nativePalette.blue[50]
  const fg = isUser ? theme.text.inverted : theme.text.primary
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
        borderColor: theme.border.subtle,
      }}
    >
      {isTool ? (
        // `IconToolbox` matches web's tool-avatar 1:1; replaces the
        // previous emoji placeholder + later `IconHammer` swap.
        <IconToolbox size={14} color={fg} />
      ) : (
        <Text style={{ fontSize: 11, fontWeight: '600', color: fg }}>{isUser ? 'You' : 'AI'}</Text>
      )}
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
  onResourceLink,
  renderCliRunArtifact,
  onShowUsage,
  thinkingLabel,
}: MessageRowProps) {
  const { theme } = useNativeTheme()
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
            <Text style={{ fontSize: 18, color: theme.text.secondary }}>↻</Text>
          </Pressable>
        )}
      </View>
    )
  }

  const iso = messageIso(msg)
  const ts = iso ? formatFriendlyTimestamp(iso) : ''
  const rawModel = msg.usage?.model ?? msg.model
  const rawModelStr = typeof rawModel === 'string' ? rawModel : rawModel?.model
  // CLI-agent messages persist their model as `cli-agent/<cli>/<modelId>`; show
  // the CLI brand dot + the model name (mirrors web) rather than the raw tag.
  const cliTag = parseCliAgentModelTag(rawModelStr)
  const cliModelId =
    cliTag?.modelId && cliTag.modelId !== 'auth-cache' && cliTag.modelId !== 'api-key'
      ? cliTag.modelId
      : undefined
  const modelLabel = cliTag
    ? cliModelId
      ? shortCliModelLabel(cliModelId)
      : cliLabel(cliTag.cli)
    : rawModelStr
  const modelDotColor = cliTag ? cliDotColor(cliTag.cli) : theme.accent.primary
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
              borderColor: theme.border.subtle,
              backgroundColor: pressed ? theme.surface.muted : theme.surface.raised,
              opacity: isThinking ? 0.4 : 1,
            })}
          >
            <IconDelete size={12} color={theme.text.secondary} />
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
        {isAssistant && (
          // Show the meta row on every assistant message — model chip
          // always rendered when a model is known (the user explicitly
          // asked for this; web's same-chip-as-previous-message dedup is
          // ignored here so every assistant message carries its identity).
          // The `$` chip is now tappable → opens a `MessageUsageSheet`
          // with the full breakdown (touch analogue of web's hover tooltip).
          <View
            // `minHeight: 28` matches the avatar circle's height so the
            // chip / timestamp row sits in a vertical box the same size as
            // the avatar. Combined with `alignItems: 'center'`, both the
            // chip cluster on the left and the timestamp on the right are
            // vertically centred inside that box — aligning their centres
            // with the avatar's centre on the same parent row.
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              minHeight: 28,
              width: '100%',
              gap: nativeSpace[3],
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
              {modelLabel ? (
                <View
                  // Padding bumped to 4px vertically (was 2px) so the chip
                  // height is ~22-24px and reads visually centred against
                  // the 28px avatar — matches web's chip dimensions.
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: nativeSpace[2],
                    paddingHorizontal: nativeSpace[5],
                    paddingVertical: 4,
                    borderRadius: nativeRadii.round,
                    borderWidth: 1,
                    borderColor: theme.border.subtle,
                    backgroundColor: theme.surface.overlay,
                  }}
                >
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: modelDotColor,
                    }}
                  />
                  <Text numberOfLines={1} style={{ fontSize: 11, color: theme.text.secondary }}>
                    {modelLabel}
                  </Text>
                </View>
              ) : null}
              {modelLabel ? (
                <View
                  style={{
                    paddingHorizontal: nativeSpace[3],
                    paddingVertical: 2,
                    borderRadius: nativeRadii.round,
                    borderWidth: 1,
                    borderColor: theme.border.subtle,
                    backgroundColor: theme.surface.overlay,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '600',
                      letterSpacing: 0.4,
                      color: theme.text.secondary,
                    }}
                  >
                    {cliTag ? 'CLI' : 'API'}
                  </Text>
                </View>
              ) : null}
              {msg.usage ? (
                <UsageChip msg={msg} onPress={onShowUsage ? () => onShowUsage(msg) : undefined} />
              ) : null}
              {msg.featureRequestId ? (
                <View
                  style={{
                    paddingHorizontal: nativeSpace[3],
                    paddingVertical: 2,
                    borderRadius: nativeRadii.round,
                    borderWidth: 1,
                    borderColor: theme.border.subtle,
                    backgroundColor: theme.surface.overlay,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '500', color: theme.text.secondary }}>
                    ↩ Resumed by request
                  </Text>
                </View>
              ) : null}
            </View>
            {(ts || thinkingLabel) && (
              <Text
                selectable={false}
                style={{ fontSize: 10, color: theme.text.secondary, opacity: 0.8 }}
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
            style={{ fontSize: 10, color: theme.text.secondary, opacity: 0.8 }}
          >
            {ts}
          </Text>
        )}

        {/* CLI agent message: the run transcript renders ABOVE the prose — tool
            steps are the work, the reply is the conclusion at the end. */}
        {isAssistant && msg.cliRunId && renderCliRunArtifact ? (
          <View style={{ width: '100%' }}>{renderCliRunArtifact(msg.cliRunId)}</View>
        ) : null}

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
                    backgroundColor: theme.accent.primary,
                    borderBottomRightRadius: nativeRadii[1],
                  }
                : isSystem
                  ? {
                      backgroundColor: theme.surface.overlay,
                      borderWidth: 1,
                      borderColor: theme.border.subtle,
                    }
                  : {
                      backgroundColor: theme.surface.raised,
                      borderWidth: 1,
                      borderColor: theme.border.subtle,
                      borderBottomLeftRadius: nativeRadii[1],
                    },
            ]}
          >
            <CollapsibleContent maxHeight={600}>
              {isUser ? (
                <RichText
                  text={msg.content}
                  onResolveFile={onResolveFile}
                  renderDependency={renderDependency}
                  // User bubble is blue → text must be white to read against
                  // it. Matches web's `text-(--text-inverted)` user bubble.
                  textColor={theme.text.inverted}
                />
              ) : (
                <Markdown text={msg.content} onResourceLink={onResourceLink} />
              )}
            </CollapsibleContent>
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
                  borderColor: theme.border.subtle,
                  backgroundColor: theme.surface.muted,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'Menlo',
                    fontSize: 12,
                    color: theme.text.primary,
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
