import type { ReferenceTarget } from 'thefactory-tools/types'
import { attachmentDisplayName } from 'thefactory-tools/utils'
import { memo, useMemo, useState, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import RichText from '../files/RichText'
import Markdown from '../Markdown'
import type { ResourceLink } from 'thefactory-tools/types'
import FileDisplay, { type UikitFileMeta } from '../files/FileDisplay'
import { isImageAttachment } from '../../../headless/utils/chatDrop'
import SentImageAttachment from './SentImageAttachment'
import { IconDelete, IconRefreshChat, IconToolbox } from '../../icons'
import type {
  AlwaysAllowScope,
  ChatMessageLike,
  GrantCovers,
} from '../../../headless/utils/chatTypes'
import type { MessageDeleteControl } from '../../../headless/utils/chatMessageDeleteTypes'
import type { MessageRestartControl } from '../../../headless/utils/chatMessageRestartTypes'
import { MESSAGE_RESTART_ACTION_LABEL } from '../../../headless/utils/chatMessageRestartConstants'
import {
  nativeAlpha,
  nativePalette,
  nativeRadii,
  nativeShadows,
  nativeSpace,
} from '../../../tokens/native'
import { messageUsageCost } from '../../../headless/utils/costDetails'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import {
  cliDotColor,
  cliLabel,
  parseCliAgentModelTag,
  shortCliModelLabel,
} from '../../../headless/utils/cliRunner'
import type { NativeAttachmentImages, NativeToolCallRenderArgs } from './chatNativeTypes'
import SubagentSteps from './ToolCall/SubagentSteps'
import BackgroundResultsRow from './BackgroundResultsRow'
import { ManagerCardView } from './ManagerCards'
import { RunParkClosure } from './ParkClosureLine'
import { RunSiblingFallbackNotice } from '../process/SiblingFallbackNotice'
import AnsweredQuestionBubble from './AnsweredQuestionBubble'
import { answeredQuestionOf } from '../../../headless/utils/agentQuestions'
import OpenQuestionsCard from './OpenQuestionsCard'
import ChatStopCard from './ChatStopCard'
import { chatStopRestart } from '../../../headless/utils/chatStopNotice'

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
 * Web reveals the cost details in a hover tooltip; touch has no hover, so on
 * tap the host opens a `MessageUsageSheet` with them. Shown, like its web
 * peer, only when the message measured something: a stored CLI turn's
 * zero-token placeholder has no details to open.
 */
function UsageChip({ msg, onPress }: { msg: ChatMessageLike; onPress?: () => void }) {
  const { theme } = useNativeTheme()
  const usage = msg.usage
  const measured = useMemo(
    () => (usage ? messageUsageCost(usage, msg.model) !== undefined : false),
    [usage, msg.model],
  )
  if (!measured) return null
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
  renderToolCall?: (args: NativeToolCallRenderArgs) => ReactNode
  /** The proposed result of a call waiting on an approval, once its preview has loaded. */
  toolPreview?: unknown
  /** When true, the tool card shows a toggle in a batch awaiting approval. */
  toolSelectable?: boolean
  /** Whether the toggle is on. */
  toolSelected?: boolean
  onToggleToolSelect?: () => void
  /** Where "Always allow" may apply for this call, the default first. */
  toolAlwaysAllowScopes?: readonly AlwaysAllowScope[]
  /** What an always-allow of this call covers. */
  toolGrantCovers?: GrantCovers
  /** Marked "Always allow" in this place: the batch's Resume grants it there. */
  toolAlwaysAllowScope?: AlwaysAllowScope
  /** Mark "Always allow" in a place, or unmark — offered beside the toggle when the ask allows it. */
  onAlwaysAllowTool?: (scope: AlwaysAllowScope | undefined) => void

  onDeleteLastMessage?: () => void
  /**
   * Describes the delete affordance for this row (label + refusal), computed by
   * the list via `describeLastMessageDelete`. Absent ⇒ the row offers no delete.
   */
  deleteControl?: MessageDeleteControl
  /** True while the delete control is held and THIS row is one of the doomed. */
  deletePreview?: boolean
  /** Raised while the delete control is held so the list can light the range. */
  onDeletePreviewChange?: (active: boolean) => void
  /** A delete is still landing — the control spins and refuses a second press. */
  deleting?: boolean

  onRestartTurn?: () => void
  /**
   * Describes the restart affordance for this row (label + refusal), computed by
   * the list via `describeLastUserMessageRestart`. Absent ⇒ the row offers no
   * restart.
   */
  restartControl?: MessageRestartControl
  onRetry?: () => void

  /** Resolve an `@<path>` inline file mention to file metadata. */
  onResolveFile?: (token: string) => UikitFileMeta | null
  /** Render an inline `#<id>` reference. */
  renderReference?: (target: ReferenceTarget) => ReactNode | undefined
  /** Route an in-app `overseer://…` resource link the assistant emitted (F.2). */
  onResourceLink?: (link: ResourceLink) => void
  /** Shows the images sent with a message as thumbnails that open full size. */
  attachmentImages?: NativeAttachmentImages
  /** Render the workspace-diff panel for a CLI-agent reply (`msg.cliRunId`). */
  renderCliRunArtifact?: (runId: string) => ReactNode
  /**
   * Render the live state of the process run this message announced
   * (`msg.processRunId`) — native peer of web's prop of the same name.
   *
   * The message REPORTS and never decides: the run's choices live in the
   * pipeline, where their context is.
   */
  renderProcessRun?: (processRunId: string) => ReactNode
  /**
   * Render the live state of the group run this message announced
   * (`msg.processGroupRunId`). A group notice about one project's run carries
   * that run too, and shows the run — where the ask is answered — instead.
   */
  renderProcessGroupRun?: (groupRunId: string) => ReactNode

  /**
   * Fired when the user taps the per-message usage `$` chip. The host
   * opens a `MessageUsageSheet` with the full breakdown — the native
   * analogue of web's hover-revealed usage tooltip.
   */
  onShowUsage?: (msg: ChatMessageLike) => void

  thinkingLabel?: string
  /** How this row's ask was settled, when it waited on one — an answered question folds to a bubble. */
  decidedAsk?: { status: string; answer?: string } | undefined
}

function Avatar({
  kind,
  handoffInitial,
}: {
  kind: 'user' | 'ai' | 'tool'
  handoffInitial?: string
}) {
  const { theme } = useNativeTheme()
  const isUser = kind === 'user'
  const isTool = kind === 'tool'
  const isHandoff = !!handoffInitial
  const bg = isHandoff
    ? theme.accent.softBg
    : isUser
      ? theme.accent.primary
      : isTool
        ? theme.surface.overlay
        : nativePalette.blue[50]
  const fg = isHandoff ? theme.accent.softFg : isUser ? theme.text.inverted : theme.text.primary
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
        borderWidth: isUser && !isHandoff ? 0 : 1,
        borderColor: isHandoff ? theme.accent.softBorder : theme.border.subtle,
      }}
    >
      {isTool ? (
        // `IconToolbox` matches web's tool-avatar 1:1; replaces the
        // previous emoji placeholder + later `IconHammer` swap.
        <IconToolbox size={14} color={fg} />
      ) : (
        <Text style={{ fontSize: 11, fontWeight: '600', color: fg }}>
          {isHandoff ? handoffInitial : isUser ? 'You' : 'AI'}
        </Text>
      )}
    </View>
  )
}

function MessageRow({
  msg,
  isLast,
  isThinking,
  renderToolCall,
  toolPreview,
  toolSelectable,
  toolSelected,
  onToggleToolSelect,
  toolAlwaysAllowScopes,
  toolGrantCovers,
  toolAlwaysAllowScope,
  onAlwaysAllowTool,
  onDeleteLastMessage,
  deleteControl,
  deletePreview = false,
  onDeletePreviewChange,
  deleting = false,
  onRestartTurn,
  restartControl,
  onRetry,
  onResolveFile,
  renderReference,
  onResourceLink,
  attachmentImages,
  renderCliRunArtifact,
  renderProcessRun,
  renderProcessGroupRun,
  onShowUsage,
  thinkingLabel,
  decidedAsk,
}: MessageRowProps) {
  const { theme } = useNativeTheme()
  // ABOVE any early return: a hook that runs on only some renders crashes.
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const role = msg.role
  if (role === 'user' && msg.backgroundResults?.length) {
    const at = messageIso(msg)
    return (
      <BackgroundResultsRow
        results={msg.backgroundResults}
        content={msg.content}
        {...(at ? { timestamp: formatFriendlyTimestamp(at) } : {})}
      />
    )
  }
  const openQuestionsCard = role === 'assistant' ? msg.openQuestionsCard : undefined
  if (openQuestionsCard) {
    const at = messageIso(msg)
    return (
      <OpenQuestionsCard
        card={openQuestionsCard}
        {...(at ? { at: formatFriendlyTimestamp(at) } : {})}
      />
    )
  }
  const managerCard = role === 'assistant' ? msg.managerCard : undefined
  if (managerCard && managerCard.kind !== 'brief') {
    const at = messageIso(msg)
    return (
      <ManagerCardView
        card={managerCard}
        {...(msg.processRunId ? { processRunId: msg.processRunId } : {})}
        {...(at ? { at: formatFriendlyTimestamp(at) } : {})}
        links={{ renderReference, onResourceLink }}
      >
        {msg.processRunId && renderProcessRun ? renderProcessRun(msg.processRunId) : null}
      </ManagerCardView>
    )
  }
  const answeredQuestion = msg.toolCall
    ? answeredQuestionOf({
        toolName: msg.toolCall.name,
        args: msg.toolCall.arguments,
        result: msg.toolResult?.result,
        ...(msg.toolResult?.type !== undefined ? { resultType: msg.toolResult.type } : {}),
        ...(decidedAsk ? { decided: decidedAsk } : {}),
      })
    : undefined
  if (answeredQuestion) return <AnsweredQuestionBubble view={answeredQuestion} />
  const isSystem = role === 'system'
  const isUser = role === 'user'
  const isAssistant = role === 'assistant'
  const isTool = role === 'tool' || !!msg.toolCall
  // A user-role turn ANOTHER AGENT handed back (e.g. the verifier's report to the
  // developer): right-aligned like a user message, but styled distinctly.
  const handoffFrom = isUser ? msg.handoffFrom : undefined
  const isHandoff = !!handoffFrom
  const handoffLabel = handoffFrom
    ? `${handoffFrom.charAt(0).toUpperCase()}${handoffFrom.slice(1)}`
    : ''

  // One card for a stop, drawn from its notice — never also the error box or the message's text.
  if (msg.stopNotice) {
    const restart = chatStopRestart({
      ...(onRestartTurn && restartControl ? { restart: restartControl } : {}),
      hasRetry: !!onRetry,
      isLast,
      isThinking,
    })
    return (
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: nativeSpace[3] }}>
        <Avatar kind="ai" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <ChatStopCard
            notice={msg.stopNotice}
            {...(restart
              ? {
                  restart,
                  onRestart: () => (restart.via === 'restart' ? onRestartTurn?.() : onRetry?.()),
                }
              : {})}
            {...(msg.cliRunId ? { runId: msg.cliRunId } : {})}
          />
        </View>
      </View>
    )
  }

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
          {onRestartTurn && restartControl ? (
            <RestartTurnButton control={restartControl} onRestart={onRestartTurn} />
          ) : null}
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
        // No hover on a touch screen: the reach of the delete is shown while the
        // control is HELD, before the release commits it. A TINT ONLY — a border
        // or padding would reflow the row under the finger mid-press. The
        // control column below opts out so it never reads as disabled.
        ...(deletePreview
          ? {
              borderRadius: nativeRadii[2],
              backgroundColor: nativeAlpha(nativePalette.red[500], 0.1),
            }
          : {}),
      }}
    >
      <View style={{ alignItems: 'center', gap: nativeSpace[2] }}>
        <Avatar
          kind={isUser ? 'user' : isTool ? 'tool' : 'ai'}
          {...(isHandoff ? { handoffInitial: handoffLabel.charAt(0) } : {})}
        />
        {onDeleteLastMessage && deleteControl && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              confirmingDelete ? 'Tap again to delete — cannot be undone' : deleteControl.label
            }
            onPress={() => {
              // Two deliberate acts: the first press arms, the second commits.
              if (!confirmingDelete) {
                setConfirmingDelete(true)
                return
              }
              setConfirmingDelete(false)
              onDeletePreviewChange?.(false)
              onDeleteLastMessage?.()
            }}
            onPressIn={() => onDeletePreviewChange?.(true)}
            onPressOut={() => onDeletePreviewChange?.(confirmingDelete)}
            // Blocked while a delete lands: the rows are gone locally but the
            // server has not agreed yet.
            disabled={deleteControl.disabled || deleting}
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
              // A locked row is not merely unavailable — keep it legible, since
              // "this history is deliberately kept" is the message it carries.
              opacity: deleteControl.locked ? 0.85 : deleteControl.disabled ? 0.4 : 1,
            })}
          >
            {deleteControl.locked ? (
              <Text style={{ fontSize: 11 }}>🔒</Text>
            ) : (
              <IconDelete size={12} color={theme.text.secondary} />
            )}
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
        {isHandoff ? (
          <Text
            selectable={false}
            style={{ fontSize: 10, color: theme.accent.softFg, alignSelf: 'flex-end' }}
          >
            {`↩ ${handoffLabel} handed this back${ts ? ` · ${ts}` : ''}`}
          </Text>
        ) : !isAssistant && !isTool && ts ? (
          <Text
            selectable={false}
            style={{ fontSize: 10, color: theme.text.secondary, opacity: 0.8 }}
          >
            {ts}
          </Text>
        ) : null}

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
              isHandoff
                ? {
                    backgroundColor: theme.accent.softBg,
                    borderWidth: 1,
                    borderColor: theme.accent.softBorder,
                    borderBottomRightRadius: nativeRadii[1],
                  }
                : isUser
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
                  renderReference={renderReference}
                  typedReferences
                  // User bubble is blue → text must be white to read against it.
                  // A hand-off bubble is accent-soft, so its text takes that fg.
                  textColor={isHandoff ? theme.accent.softFg : theme.text.inverted}
                />
              ) : (
                <Markdown
                  text={msg.content}
                  onResourceLink={onResourceLink}
                  renderReference={renderReference}
                  typedReferences
                />
              )}
            </CollapsibleContent>
          </View>
        )}

        {/* Directly under the announcement it belongs to, so "the work
            started" and what the work is now DOING read as one thing. */}
        {isAssistant && msg.processRunId && msg.processRunParkedAt !== undefined ? (
          <View style={{ width: '100%', marginTop: nativeSpace[2] }}>
            <RunParkClosure runId={msg.processRunId} parkedAt={msg.processRunParkedAt} />
          </View>
        ) : null}
        {isAssistant && msg.processRunId && msg.processRunChecksEntryId ? (
          <View style={{ width: '100%', marginTop: nativeSpace[2] }}>
            <RunSiblingFallbackNotice
              runId={msg.processRunId}
              entryId={msg.processRunChecksEntryId}
            />
          </View>
        ) : null}
        {isAssistant && msg.processRunId && renderProcessRun ? (
          <View style={{ width: '100%', marginTop: nativeSpace[2] }}>
            {renderProcessRun(msg.processRunId)}
          </View>
        ) : isAssistant && msg.processGroupRunId && renderProcessGroupRun ? (
          <View style={{ width: '100%', marginTop: nativeSpace[2] }}>
            {renderProcessGroupRun(msg.processGroupRunId)}
          </View>
        ) : null}

        {isTool && msg.toolCall && (
          <View style={{ width: '100%' }}>
            {renderToolCall ? (
              renderToolCall({
                toolCall: msg.toolCall,
                result: msg.toolResult?.result,
                resultType: msg.toolResult?.type ?? (msg.error ? 'errored' : undefined),
                durationMs: msg.toolResult?.durationMs ?? msg.durationMs,
                ...(msg.startedAt !== undefined ? { startedAt: msg.startedAt } : {}),
                ...(toolPreview !== undefined ? { previewResult: toolPreview } : {}),
                ...(toolSelectable
                  ? {
                      selectable: true,
                      selected: toolSelected === true,
                      ...(onToggleToolSelect ? { onToggleSelect: onToggleToolSelect } : {}),
                      ...(onAlwaysAllowTool
                        ? {
                            onAlwaysAllow: onAlwaysAllowTool,
                            ...(toolAlwaysAllowScopes
                              ? { alwaysAllowScopes: toolAlwaysAllowScopes }
                              : {}),
                            ...(toolGrantCovers ? { grantCovers: toolGrantCovers } : {}),
                            ...(toolAlwaysAllowScope
                              ? { alwaysAllowScope: toolAlwaysAllowScope }
                              : {}),
                          }
                        : {}),
                    }
                  : {}),
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
            {msg.subagentMessages?.length ? (
              <SubagentSteps
                messages={msg.subagentMessages}
                renderToolCall={renderToolCall}
                renderReference={renderReference}
                onResourceLink={onResourceLink}
              />
            ) : null}
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
              if (attachmentImages && isImageAttachment(path)) {
                return (
                  <SentImageAttachment
                    key={`att-${i}-${path}`}
                    path={path}
                    images={attachmentImages}
                  />
                )
              }
              const name = attachmentDisplayName(path)
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

        {onRestartTurn && restartControl && (
          <RestartTurnButton control={restartControl} onRestart={onRestartTurn} alignEnd={isUser} />
        )}
      </View>
    </View>
  )
}

/** The control that runs the agent again on the chat's last turn. */
function RestartTurnButton({
  control,
  onRestart,
  alignEnd = false,
}: {
  control: MessageRestartControl
  onRestart: () => void
  alignEnd?: boolean
}) {
  const { theme } = useNativeTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={control.label}
      onPress={onRestart}
      disabled={control.disabled}
      hitSlop={4}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: nativeSpace[2],
        alignSelf: alignEnd ? 'flex-end' : 'flex-start',
        marginTop: nativeSpace[2],
        height: 24,
        paddingHorizontal: nativeSpace[4],
        borderRadius: nativeRadii[1],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: pressed ? theme.surface.muted : theme.surface.raised,
        opacity: control.disabled ? 0.4 : 1,
      })}
    >
      <IconRefreshChat size={12} color={theme.text.secondary} />
      <Text style={{ fontSize: 11, color: theme.text.secondary }}>
        {MESSAGE_RESTART_ACTION_LABEL}
      </Text>
    </Pressable>
  )
}

export default memo(MessageRow)
