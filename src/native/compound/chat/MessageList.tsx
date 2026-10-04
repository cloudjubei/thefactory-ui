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
import CliRunMessages from './CliRunMessages'
import { formatDurationMs } from '../../../headless'
import type { UikitFileMeta } from '../files/FileDisplay'
import type { ResourceLink } from 'thefactory-tools/types'
import type {
  ChatMessageLike,
  PendingToolGrant,
  ToolCallLike,
} from '../../../headless/utils/chatTypes'
import { describeLastMessageDelete } from '../../../headless/utils/chatMessageDelete'
import { isInDeleteRange, lastMessageDeleteFromIndex } from '../../../headless/utils/chatTurnDelete'
import { describeLastUserMessageRestart } from '../../../headless/utils/chatMessageRestart'
import type { CliRunBlockedOn } from '../../../headless/utils/cliRunActivityTypes'
import { cliLabel, messageModelTag, parseCliAgentModelTag } from '../../../headless/utils/cliRunner'
import { nativeRadii, nativeShadows, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import type { NativeToolCallRenderArgs } from './chatNativeTypes'
import { firstUnreadMessageIndex } from '../../../headless/utils/chatUnread'
import type { CliDecidedAsk } from '../../../headless/utils/cliRunActivityTypes'
import { CHAT_OPEN_SETTLE_MAX_MS } from '../../../headless/utils/chatUnreadConstants'

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
  /**
   * True while a send this session made is still running — including a CLI turn,
   * which `isThinking` deliberately excludes once its run view is mounted. Gates
   * the delete control off the tail message while the runner may still write to
   * it. Mirrors web's prop of the same name.
   */
  isSending?: boolean
  /** A delete is still landing on the server — blocks a second one. */
  isDeleting?: boolean
  /**
   * Whether a turn is running according to the SERVER, not just this session.
   * Without it a second client renders the restart control enabled over someone
   * else's in-flight turn, and pressing it aborts that turn to start a competing
   * one.
   */
  isBusy?: boolean
  /** Streaming-pending assistant turn rendered as the last bubble. */
  pending?: { role: 'user' | 'assistant'; content: string } | null
  /** Active CLI run id while it streams: renders the live run as a trailing
   * assistant message (model chip + transcript + final reply). */
  pendingCliRunId?: string
  /** Model tag for the live CLI run — drives the live message's model chip. */
  pendingCliModel?: string
  /** ISO start time of the live CLI run — the live message's timestamp. */
  pendingCliStartedAt?: string
  /**
   * What the chat's ACTIVE CLI run is waiting on the human for. Applied only to
   * the run named by {@link pendingCliRunId} — a persisted row from an earlier
   * turn must never claim to be blocked on today's approval.
   */
  cliBlockedOn?: readonly CliRunBlockedOn[]
  /** The chat's undecided CLI asks — the ordinary tool asks decided on the rows that show them. */
  cliAsks?: readonly PendingToolGrant[]
  /** The chat's decided asks — what a row that once waited on one shows now. */
  decidedAsks?: readonly CliDecidedAsk[]
  /** Reported by each CLI turn: the asks its rows show — see `CliRunMessages.onClaimAsks`. */
  onClaimAsks?: (runId: string, askIds: string[]) => void
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
  /** True when the chat's history is closed and kept: delete controls render LOCKED. */
  historyLocked?: boolean
  /** Re-run the chat's trailing user message. Absent ⇒ no row offers a restart. */
  onRestartTurn?: () => void

  /** Host renderer for a tool call. */
  renderToolCall?: (args: NativeToolCallRenderArgs) => ReactNode
  /**
   * Replaces a tool row's card outright — see `MessageRow.toolRowOverride`.
   * Returning nothing leaves the host renderer in place. Deliberately not
   * forwarded to `CliRunMessages`: a CLI run's rows are not in `messages`, so
   * the host cannot tell whether one was rendered and would show its fallback
   * as well.
   */
  renderToolRowOverride?: (toolCall: ToolCallLike) => ReactNode

  onResolveFile?: (token: string) => UikitFileMeta | null
  /** Route an in-app `overseer://…` resource link. Forwarded to MessageRow's Markdown (F.2). */
  onResourceLink?: (link: ResourceLink) => void
  renderDependency?: (dep: string) => ReactNode
  /** Render the workspace-diff panel for a CLI-agent reply. Forwarded to MessageRow. */
  renderCliRunArtifact?: (runId: string) => ReactNode
  /** Forwarded to each row: the live process run an announcement message launched. */
  renderProcessRun?: (processRunId: string) => ReactNode
  /** Forwarded to each row: the live group run an announcement launched. */
  renderProcessGroupRun?: (groupRunId: string) => ReactNode

  /** Forwards to `MessageRow.onShowUsage`. */
  onShowUsage?: (msg: ChatMessageLike) => void

  /** Caller-rendered content shown when the message list is empty (e.g. a call-to-action panel). */
  emptyStateContent?: ReactNode

  thinkingLabel?: string
}

export default function MessageList({
  chatId,
  messages,
  isThinking = false,
  isSending = false,
  isDeleting = false,
  isBusy,
  pending,
  pendingCliRunId,
  pendingCliModel,
  cliBlockedOn,
  cliAsks,
  decidedAsks,
  onClaimAsks,
  systemPrompt,
  systemPromptTimestamp,
  numberMessagesToSend,
  lastReadIso,
  onAtBottomChange,
  onReadLatest,
  scrollToBottomSignal,
  onDeleteLastMessage,
  historyLocked,
  onRetry,
  onRestartTurn,
  renderToolCall,
  renderToolRowOverride,
  onResolveFile,
  onResourceLink,
  renderDependency,
  renderCliRunArtifact,
  renderProcessRun,
  renderProcessGroupRun,
  onShowUsage,
  emptyStateContent,
  thinkingLabel,
}: MessageListProps) {
  const { theme } = useNativeTheme()
  const scrollRef = useRef<RNScrollView>(null)
  const [atBottom, setAtBottom] = useState(true)
  const lastAtBottomRef = useRef(true)
  // First-unread positioning: the y-offset of the unread divider and the
  // current first-unread window index (mirrored into a ref so the open effect
  // can read it without a dep).
  const anchorYRef = useRef<number | null>(null)
  const firstUnreadRef = useRef<number | null>(null)
  // Where the open is held while the chat SETTLES. A CLI reply renders its
  // run's transcript, which loads seconds after the chat itself, so content
  // keeps growing after the first scroll; the hold is re-applied on each
  // growth until the user drags or the cap runs out.
  const settleRef = useRef<'bottom' | 'unread' | null>(null)
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const endOpenSettle = useCallback(() => {
    clearTimeout(settleTimerRef.current)
    settleRef.current = null
  }, [])
  useEffect(() => endOpenSettle, [endOpenSettle])

  // Latest message iso — kept in a ref so onScroll can fire `onReadLatest`
  // without re-binding on every render.
  const latestIsoRef = useRef<string | undefined>(undefined)

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (settleRef.current === 'unread') return
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

  // On chat change: forget the previous chat's positioning.
  const openedChatRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    endOpenSettle()
    anchorYRef.current = null
    openedChatRef.current = undefined
  }, [chatId, endOpenSettle])

  /** Holds the unread divider near the top while the chat settles. */
  const positionToUnread = useCallback(() => {
    if (settleRef.current !== 'unread' || anchorYRef.current == null) return
    scrollRef.current?.scrollTo({ y: Math.max(0, anchorYRef.current - 12), animated: false })
  }, [])

  // Once the chat's messages are here: open at the first unread message when
  // there is one (the unread anchor's `onLayout` does the scroll); otherwise
  // open pinned to the bottom. Deciding before they arrived found nothing
  // unread, reported the chat read, and erased where reading should resume.
  const hasMessages = messages.length > 0
  useEffect(() => {
    if (!hasMessages || openedChatRef.current === chatId) return
    openedChatRef.current = chatId
    const hasUnread = firstUnreadRef.current != null
    clearTimeout(settleTimerRef.current)
    settleRef.current = hasUnread ? 'unread' : 'bottom'
    settleTimerRef.current = setTimeout(endOpenSettle, CHAT_OPEN_SETTLE_MAX_MS)
    lastAtBottomRef.current = !hasUnread
    setAtBottom(!hasUnread)
    onAtBottomChange?.(!hasUnread)
    if (hasUnread) positionToUnread()
    else scrollRef.current?.scrollToEnd({ animated: false })
  }, [chatId, hasMessages, onAtBottomChange, endOpenSettle, positionToUnread])

  /** Keeps a bottom open pinned while the chat's replies grow in. */
  const onContentSizeChange = useCallback(() => {
    if (settleRef.current === 'bottom') scrollRef.current?.scrollToEnd({ animated: false })
  }, [])

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
  // Cold-start signal: only the chat's FIRST cli run (turn 1) pays the boot;
  // resident turns 2..N are warm. Keyed by cliRunId so it survives windowing.
  const firstCliRunId = useMemo(() => renderable.find((m) => m.cliRunId)?.cliRunId, [renderable])

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
  // Judged against the last-read mark as it stood when the chat opened: the
  // live mark moves the moment the list reports reaching the bottom.
  const openedReadRef = useRef<{ chatId?: string; lastReadIso?: string }>({})
  if (openedReadRef.current.chatId !== chatId || renderable.length === 0)
    openedReadRef.current = { chatId, lastReadIso }
  const openLastReadIso = openedReadRef.current.lastReadIso
  const firstUnreadInWindow = useMemo(
    () => firstUnreadMessageIndex(windowed, openLastReadIso),
    [windowed, openLastReadIso],
  )
  firstUnreadRef.current = firstUnreadInWindow

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
  // Holding the delete control lights every row it would remove — derived from
  // the SAME rule the store applies, so the preview cannot drift from the effect.
  const [deletePreview, setDeletePreview] = useState(false)
  const deleteFromIndex = useMemo(() => lastMessageDeleteFromIndex(windowed), [windowed])
  const prevUserCount = renderable.filter((m) => m.role === 'user').length
  // A turn this session started is still streaming. `pendingCliRunId` is NOT a
  // signal here: it stays set after a CLI run terminates so the run view keeps
  // its mounted instance, which would leave the delete control refusing forever.
  // A run started before a reload is caught inside `CliRunMessages` instead,
  // off the run record's own status.
  const turnInFlight = (isBusy ?? false) || isThinking || !!pending || isSending

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={endOpenSettle}
        onContentSizeChange={onContentSizeChange}
        contentContainerStyle={{
          padding: nativeSpace[6],
          gap: nativeSpace[6],
        }}
      >
        {/* Idle-chat preview only. During a run a CLI turn streams through
            CliRunMessages, not `messages`, so this bubble used to sit on top of
            the run's booting spinner for the whole run. Suppress it whenever a
            turn is in flight (`turnInFlight` includes server-truth `isBusy`, so
            it covers a run this session did not start). */}
        {systemPrompt && messages.length === 0 && !turnInFlight && (
          <SystemPromptBubble content={systemPrompt} timestamp={systemPromptTimestamp} />
        )}
        {messages.length === 0 && !isThinking && emptyStateContent ? emptyStateContent : null}
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
              backgroundColor: pressed ? theme.surface.muted : theme.surface.overlay,
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
          const deleteControl = describeLastMessageDelete({
            hasDeleteAction: !!onDeleteLastMessage,
            isLast: i === lastIndex,
            // NOT `|| isDeleting`: a live agent HIDES the control, but our own
            // delete landing must keep it on screen to show the spinner.
            turnInFlight,
            runId: msg.cliRunId,
            historyLocked,
          })
          const restartControl = describeLastUserMessageRestart({
            hasRestartAction: !!onRestartTurn,
            isLast: i === lastIndex,
            role: msg.role,
            turnInFlight,
          })
          const row = (
            // A CLI-run message keys on its runId so the live (trailing) and
            // persisted (inline) blocks share ONE key — React moves the mounted
            // CliRunMessages in place across the handoff (no finish flash).
            <View
              key={msg.cliRunId ? `cli-${msg.cliRunId}` : (msg.id ?? `msg-${startIndex + i}`)}
              style={{ gap: nativeSpace[6] }}
            >
              {cutoffIndexInWindow === i ? (
                <CutoffDivider numberMessagesToSend={numberMessagesToSend} />
              ) : null}
              {msg.cliRunId ? (
                <CliRunMessages
                  runId={msg.cliRunId}
                  onResourceLink={onResourceLink}
                  model={messageModelTag(msg.model)}
                  baseIndex={i}
                  renderToolCall={renderToolCall}
                  onResolveFile={onResolveFile}
                  renderDependency={renderDependency}
                  renderCliRunArtifact={renderCliRunArtifact}
                  renderProcessRun={renderProcessRun}
                  renderProcessGroupRun={renderProcessGroupRun}
                  onShowUsage={onShowUsage}
                  coldStart={msg.cliRunId === firstCliRunId}
                  storedReply={msg.content}
                  {...(cliBlockedOn && msg.cliRunId === pendingCliRunId
                    ? { blockedOn: cliBlockedOn }
                    : {})}
                  cliAsks={cliAsks}
                  decidedAsks={decidedAsks}
                  onClaimAsks={onClaimAsks}
                  onDeleteTurn={onDeleteLastMessage}
                  deleteControl={deleteControl}
                  deletePreview={isInDeleteRange(i, deleteFromIndex, deletePreview)}
                  onDeletePreviewChange={setDeletePreview}
                  deleting={isDeleting}
                />
              ) : (
                <MessageRow
                  msg={msg}
                  globalIndex={i}
                  totalMessages={windowed.length}
                  isThinking={isThinking}
                  isLast={i === lastIndex}
                  prevUserMessagesLen={prevUserCount}
                  enhancedTotalLength={windowed.length}
                  renderToolCall={renderToolCall}
                  toolRowOverride={
                    msg.toolCall && renderToolRowOverride
                      ? renderToolRowOverride(msg.toolCall)
                      : undefined
                  }
                  onDeleteLastMessage={onDeleteLastMessage}
                  deleteControl={deleteControl}
                  deletePreview={isInDeleteRange(i, deleteFromIndex, deletePreview)}
                  onDeletePreviewChange={setDeletePreview}
                  deleting={isDeleting}
                  onRestartTurn={onRestartTurn}
                  restartControl={restartControl}
                  onRetry={onRetry}
                  onResolveFile={onResolveFile}
                  renderDependency={renderDependency}
                  onResourceLink={onResourceLink}
                  renderCliRunArtifact={renderCliRunArtifact}
                  renderProcessRun={renderProcessRun}
                  renderProcessGroupRun={renderProcessGroupRun}
                  onShowUsage={onShowUsage}
                  thinkingLabel={perMsgThinking}
                />
              )}
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
            onResourceLink={onResourceLink}
            thinkingLabel={thinkingLabel}
          />
        )}
        {/* Live CLI run: streamed as normal chat messages. Skipped once a
            persisted message carries this runId (the inline block owns it then);
            the shared `cli-${runId}` key lets React move the instance across the
            handoff with no finish flash. */}
        {pendingCliRunId && !renderable.some((m) => m.cliRunId === pendingCliRunId) ? (
          <View key={`cli-${pendingCliRunId}`}>
            <CliRunMessages
              runId={pendingCliRunId}
              onResourceLink={onResourceLink}
              model={pendingCliModel}
              baseIndex={windowed.length}
              renderToolCall={renderToolCall}
              onResolveFile={onResolveFile}
              renderDependency={renderDependency}
              renderCliRunArtifact={renderCliRunArtifact}
              renderProcessRun={renderProcessRun}
              renderProcessGroupRun={renderProcessGroupRun}
              onShowUsage={onShowUsage}
              coldStart={firstCliRunId === undefined || firstCliRunId === pendingCliRunId}
              {...(cliBlockedOn ? { blockedOn: cliBlockedOn } : {})}
              cliAsks={cliAsks}
              decidedAsks={decidedAsks}
              onClaimAsks={onClaimAsks}
            />
          </View>
        ) : null}
        {turnInFlight && (!pending || !pending.content) && !pendingCliRunId && (
          // A CLI turn boots its container before the first transcript byte
          // (and before pendingCliRunId is set). Show "Preparing <agent>" for
          // that window — driven by the model tag set synchronously on send.
          // `turnInFlight` (not just `isThinking`) so a run this session did NOT
          // start — launched elsewhere or resumed after reload, where `isBusy`
          // is the only signal — still shows a spinner, not the system prompt.
          <ThinkingRow
            label={thinkingLabel ?? 'Thinking'}
            {...(pendingCliModel
              ? firstCliRunId === undefined
                ? {
                    spinnerLabel: `Preparing ${
                      parseCliAgentModelTag(pendingCliModel)?.cli
                        ? cliLabel(parseCliAgentModelTag(pendingCliModel)!.cli)
                        : 'the agent'
                    }…`,
                    spinnerSubLabel: 'The first message is slowest while the sandbox starts up.',
                  }
                : { spinnerLabel: 'Working…' }
              : { spinnerLabel: 'Working…' })}
          />
        )}
      </ScrollView>
      {!atBottom && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Scroll to latest"
          onPress={() => {
            endOpenSettle()
            scrollRef.current?.scrollToEnd({ animated: true })
          }}
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
          <Text style={{ fontSize: 12, color: theme.text.primary }}>↓ Scroll to latest</Text>
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
