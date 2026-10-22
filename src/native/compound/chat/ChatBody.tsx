import type { ReferenceTarget } from 'thefactory-tools/types'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import type { LaunchModelChipSlot } from '../../../headless/utils/launchAgentPickTypes'
import { useProjectsOptional } from '../../../headless/contexts/ProjectsContext'
import { chatTitleFromContextId } from '../../../headless/utils/sendChatMessageView'
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native'
import Alert from '../../primitives/Alert'
import { IconChevronLeft, IconChevronRight } from '../../icons'
import AgentQuestionCard from './AgentQuestionCard'
import RemedyCard from './RemedyCard'
import ChatInput, { type ChatInputProps } from './ChatInput'
import CredentialCaptureCard from './CredentialCaptureCard'
import ApprovalPanel from './ApprovalPanel'
import MessageList from './MessageList'
import PendingMessagesStack from './PendingMessagesStack'
import HeldAgentMessagesStack from './HeldAgentMessagesStack'
import type { ChatPendingQueue } from '../../../headless/hooks/useChatComposer'
import { usePendingAutoDispatch } from '../../../headless/hooks/usePendingAutoDispatch'
import type { UikitFileMeta } from '../files/FileDisplay'
import type { ResourceLink } from 'thefactory-tools/types'
import {
  partitionGrants,
  shownQuestionId,
  splitParkedAsks,
  userAsks,
} from '../../../headless/utils/agentQuestions'
import { QUESTION_PAGER } from '../../../headless/utils/agentQuestionConstants'
import type { ToolAskDecidedLine } from '../../../headless/utils/toolAskCardTypes'
import StillWaitingRow from './StillWaitingRow'
import { ToolAskDecidedRow } from './ToolAskCard'
import { panelApprovalGrants } from '../../../headless/utils/approvalGrant'
import { useClaimedAsks } from '../../../headless/hooks/useInlineApprovals'
import { useHeldAgentMessages } from '../../../headless/hooks/useHeldAgentMessages'
import { useShownLiveRun } from '../../../headless/hooks/useShownLiveRun'
import { useChatDecidedAsks } from '../../../headless/hooks/useChatDecidedAsks'
import { commitReceiptShas } from '../../../headless/utils/gitChangeApproval'
import { toolAskDecidedLinesAwaitingRows } from '../../../headless/utils/toolAskCard'
import { blockedOnFromGrants } from '../../../headless/utils/cliRunActivity'
import { capturesBlockedOn } from '../../../headless/utils/credentialCaptures'
import { isAgentRunChatKey } from '../../../headless/utils/agentRunTranscript'
import type {
  ChatLiveStateLike,
  ChatMessageLike,
  PendingToolGrant,
} from '../../../headless/utils/chatTypes'
import type {
  CredentialCapture,
  CredentialCaptureFields,
} from '../../../headless/utils/credentialCaptureTypes'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import type { NativeToolCallRenderArgs } from './chatNativeTypes'
import type { ToolApprovalPreviewFetcher } from '../../../headless/hooks/useToolApprovalPreviews'
import {
  ChatActionsProvider,
  type ChatActions,
} from '../../../headless/contexts/ChatActionsContext'
import { useChatOpenChanges } from '../../../headless/hooks/useChatOpenChanges'
import { ChatChangesBarConnected } from './ChatChangesBarConnected'
import { ChatChangesMarkerConnected } from './ChatChangesMarkerConnected'

export interface ChatBodyProps {
  /**
   * The chat's key (`getChatContextKey`) — an agent run's chat
   * (`isAgentRunChatKey`) reads as its transcript. Matches web.
   */
  chatId?: string
  /** The chat's project, forwarded to the launch approval so it can resolve the
   * process proposal a user reads before approving. */
  projectId?: string
  /** The chat's group, forwarded to a launch across the group's projects. */
  groupId?: string
  /** The chat's display name — the sender an agent's message into another chat is labelled with. */
  chatTitle?: string
  /**
   * The app's own model chip for THIS chat, rendered inside a launch approval so
   * the model can be picked before the work starts. A host slot because the
   * connected chip lives in the app, not in this library.
   */
  renderApprovalModelChip?: (picked: LaunchModelChipSlot) => ReactNode
  /** Caller-rendered header (typically `<ChatHeader />`). When omitted no
   * header section is rendered. */
  header?: ReactNode

  /** Optional banner for send-side errors. */
  sendError?: { message: string } | null

  /** When provided, replaces the standard chat input (e.g. for read-only
   * agent-run chats). */
  inputOverride?: ReactNode

  /**
   * True when this chat's history is closed and deliberately kept (archived /
   * consolidated). Rows then show their delete control as LOCKED rather than
   * hiding it — the record of how the work happened is the point of keeping it,
   * and a missing button reads as a bug rather than a decision.
   */
  historyLocked?: boolean

  messages: ChatMessageLike[]
  /**
   * The chat's messages are still loading. Ordinary tool asks then wait for the
   * rows that will show them instead of flashing up on the approval panel.
   */
  messagesLoading?: boolean
  /** The chat's metadata — where the agent messages held for it until it is free are kept. */
  chatMetadata?: Record<string, unknown>
  liveState: ChatLiveStateLike

  /** Optional system prompt rendered above the message list. */
  systemPrompt?: string
  systemPromptTimestamp?: string

  /** Draws a context cut-off divider per the chat's `numberMessagesToSend`. */
  numberMessagesToSend?: number

  /** Last-read timestamp — opens the list at the first unread message. */
  lastReadIso?: string

  /** Host renderer for a tool call until `ToolCallCard`'s native peer lands. */
  renderToolCall?: (args: NativeToolCallRenderArgs) => ReactNode
  /** Host-supplied tool-preview fetcher — see `MessageList.previewTool`. */
  previewTool?: ToolApprovalPreviewFetcher

  onResolveFile?: (token: string) => UikitFileMeta | null
  renderReference?: (target: ReferenceTarget) => ReactNode | undefined
  /** Route an in-app `overseer://…` resource link. Forwarded to MessageList (F.2). */
  onResourceLink?: (link: ResourceLink) => void
  /**
   * Opens the full review of a CLI turn's changes — on a phone, a screen pushed
   * over the chat. Given it (and a project), each turn that changed files leaves
   * a one-line marker in the conversation and the chat's open changes wait in a
   * bar above the message box. Web's peer is `renderCliRunReview`.
   */
  onOpenReview?: (runId: string) => void
  /** Forwarded to the message list: the live process run an announcement message launched. */
  renderProcessRun?: (processRunId: string) => ReactNode
  /** Forwarded to the message list: the live group run an announcement launched. */
  renderProcessGroupRun?: (groupRunId: string) => ReactNode

  /** Fired when the user taps the per-message `$` usage chip. Host opens
   *  a `MessageUsageSheet` with the full breakdown. */
  onShowUsage?: (msg: ChatMessageLike) => void

  onSend: (content: string, attachments?: string[]) => Promise<void> | void
  onAbort?: () => Promise<void> | void
  /**
   * Whether a turn is still running, according to the SERVER. `liveState.isSending`
   * only knows about a send this browser session made, so after a reload — or on a
   * second client — a multi-minute CLI turn shows an idle composer with no way to
   * stop it. Hosts pass the run id they resolved from the backend here.
   */
  isBusy?: boolean
  /**
   * The CLI run the SERVER says this chat has active, from `usePendingToolGrants`.
   * `liveState.cliRunId` only knows about a send this session made, so a reload —
   * or a second client — would otherwise show a multi-minute turn with no live
   * transcript at all. Used as the fallback for the live run view.
   */
  activeCliRunId?: string

  onDeleteLastMessage?: () => Promise<void> | void
  onRetry?: () => Promise<void> | void
  /**
   * Re-run the chat's trailing user message — the agent runs again on the
   * conversation as it stands, with no copy of the message appended. Omit it
   * and no row offers a restart (e.g. an agent-run chat, or one whose run is
   * live).
   */
  onRestartTurn?: () => Promise<void> | void

  canSend?: boolean

  onAtBottomChange?: (atBottom: boolean) => void
  /** Fired with the latest visible message's ISO when the list returns to
   * the bottom — host advances per-chat read cursors. Matches web. */
  onReadLatest?: (iso?: string) => void
  scrollToBottomSignal?: number

  /** Caller-rendered content shown when the message list is empty (e.g. a call-to-action panel). */
  emptyStateContent?: ReactNode
  /** Forwarded to the MessageList: the conversation's opening, above every message. */
  leadingContent?: ReactNode

  /**
   * The chat's asks — an API turn's and a CLI run's alike — from
   * `usePendingToolGrants`. An ordinary tool ask is decided on the row that
   * shows its call; the rest take the composer's place in the approval panel,
   * and `askUser` questions as question cards.
   */
  grants?: PendingToolGrant[]

  /**
   * In-chat credential captures for this chat, from `useCredentialCaptures`.
   * Only the ones still awaiting the user render, and each takes the composer's
   * place exactly as an `askUser` question does — paged with the questions — so
   * the agent parked on it is answered before anything else is typed. The typed
   * fields go from the card straight to the credentials API via
   * {@link onSubmitCredentialCapture} — never through chat state and never into
   * the transcript.
   */
  credentialCaptures?: CredentialCapture[]
  onSubmitCredentialCapture?: (id: string, fields: CredentialCaptureFields) => Promise<void>
  onCancelCredentialCapture?: (id: string) => Promise<void>

  /** Forwarded to the inner `ChatInput`. */
  inputProps?: Omit<
    ChatInputProps,
    'value' | 'onChange' | 'onSend' | 'onAbort' | 'isThinking' | 'isConfigured'
  >
  inputValue: string
  onInputChange: (value: string) => void
  /**
   * The chat's pending queue, from `useChatComposer`. When given, a send while
   * the agent is busy is queued (shown above the composer) instead of refused,
   * and the queue goes out as one message once the turn ends.
   */
  pendingQueue?: ChatPendingQueue
}

const NO_IDS: ReadonlySet<string> = new Set()

export default function ChatBody({
  chatId,
  header,
  sendError,
  inputOverride,
  historyLocked,
  messages,
  messagesLoading = false,
  chatMetadata,
  liveState,
  systemPrompt,
  systemPromptTimestamp,
  numberMessagesToSend,
  lastReadIso,
  renderToolCall,
  previewTool,
  onResolveFile,
  renderReference,
  onResourceLink,
  onOpenReview,
  renderProcessRun,
  renderProcessGroupRun,
  projectId,
  groupId,
  chatTitle: chatTitleProp,
  renderApprovalModelChip,
  onShowUsage,
  emptyStateContent,
  leadingContent,
  grants,
  credentialCaptures,
  onSubmitCredentialCapture,
  onCancelCredentialCapture,
  onSend,
  onAbort,
  isBusy,
  activeCliRunId,
  onDeleteLastMessage,
  onRetry,
  onRestartTurn,
  canSend = true,
  onAtBottomChange,
  onReadLatest,
  scrollToBottomSignal,
  inputProps,
  inputValue,
  onInputChange,
  pendingQueue,
}: ChatBodyProps) {
  const { theme } = useNativeTheme()
  const { height: windowHeight } = useWindowDimensions()
  // Hosts rarely pass chatTitle; derive it from this chat's context id so
  // sendChatMessage cards name the sender instead of "an agent".
  const projects = useProjectsOptional()?.projects
  const chatTitle = useMemo(
    () =>
      chatTitleProp ??
      chatTitleFromContextId(chatId, (id) => projects?.find((p) => p.id === id)?.title),
    [chatTitleProp, chatId, projects],
  )
  // A capture is only actionable when the host wired both resolutions, so an
  // unwired ChatBody shows no form rather than one that cannot be answered.
  const answerableCaptures = useMemo(
    () =>
      onSubmitCredentialCapture && onCancelCredentialCapture ? (credentialCaptures ?? []) : [],
    [credentialCaptures, onSubmitCredentialCapture, onCancelCredentialCapture],
  )
  const asks = useMemo(
    () => userAsks(partitionGrants(grants).questions, answerableCaptures),
    [grants, answerableCaptures],
  )
  const [parked, setParked] = useState<{ chatId?: string; ids: ReadonlySet<string> }>({
    ids: new Set(),
  })
  const parkedIds = parked.chatId === chatId ? parked.ids : NO_IDS
  const setAskParked = (id: string, on: boolean) => {
    const next = new Set(parkedIds)
    if (on) next.add(id)
    else next.delete(id)
    setParked({ ...(chatId !== undefined ? { chatId } : {}), ids: next })
  }
  const { open: openAsks, parked: parkedAsks } = splitParkedAsks(asks, parkedIds)
  const [chosenAskId, setChosenAskId] = useState<string>()
  const shownAskKey = shownQuestionId(
    openAsks.map((a) => a.id),
    chosenAskId,
  )
  const shownIndex = openAsks.findIndex((a) => a.id === shownAskKey)
  const shownAsk = shownIndex >= 0 ? openAsks[shownIndex] : undefined
  const [decided, setDecided] = useState<{
    chatId?: string
    lines: { id: string; line: ToolAskDecidedLine }[]
  }>({ lines: [] })
  const decidedLines = decided.chatId === chatId ? decided.lines : []
  const addDecidedLine = (id: string, line: ToolAskDecidedLine) =>
    setDecided({
      ...(chatId !== undefined ? { chatId } : {}),
      lines: [...decidedLines.filter((l) => l.id !== id), { id, line }],
    })
  const remedyGrants = useMemo(() => partitionGrants(grants).remedies, [grants])
  // EVERY pending approval takes the composer's place so the asks are unmissable
  // while the conversation stays visible. They stack: an ask outlives the turn
  // that raised it, so a later turn's ask can arrive on top of an unanswered one
  // — that pile-up used to fall back to a modal covering the chat. `Decide later`
  // dismisses the current set back to the composer WITHOUT deciding; a NEW ask
  // (changing the id set) re-shows it, because the dismissed key no longer matches.
  // Ordinary tool asks are decided on the rows that show them — a CLI turn's
  // and an API turn's alike; each reports which asks it shows, and the panel
  // keeps only the rest.
  const { claimedAskIds, unsettledRunIds, onClaimAsks } = useClaimedAsks()
  const held = useHeldAgentMessages(chatId, chatMetadata)
  const pendingAskIds = useMemo(() => (grants ?? []).map((g) => g.id), [grants])
  const decidedAsks = useChatDecidedAsks(chatId, pendingAskIds)
  const shownDecidedLines = toolAskDecidedLinesAwaitingRows(decidedLines, decidedAsks)
  const approvalGrants = useMemo(
    () => panelApprovalGrants(grants, claimedAskIds, { loading: messagesLoading, unsettledRunIds }),
    [grants, claimedAskIds, messagesLoading, unsettledRunIds],
  )
  const approvalKey = approvalGrants.map((g) => g.id).join('|')
  const [approvalDismissedKey, setApprovalDismissedKey] = useState<string | null>(null)
  const showApprovalPanel = approvalGrants.length > 0 && approvalKey !== approvalDismissedKey
  // One approval at a time, paged like the questions — parity with web.
  const approvalIds = useMemo(() => approvalGrants.map((g) => g.id), [approvalGrants])
  const [chosenApprovalId, setChosenApprovalId] = useState<string>()
  const shownApprovalId = shownQuestionId(approvalIds, chosenApprovalId)
  const shownApprovalIndex = approvalIds.findIndex((id) => id === shownApprovalId)
  const shownApproval = approvalGrants[shownApprovalIndex]
  // While a CLI run streams, show the live Agent-run panel for its runId instead
  // of the raw-text pending bubble (which flashed into the final message). Falls
  // back to the run the SERVER reports for this chat, so a reload keeps watching
  // a turn this session never started.
  // Held past the run's end until the persisted reply carries it — see
  // `useShownLiveRun`.
  const cliRunId = useShownLiveRun(chatId, liveState.cliRunId ?? activeCliRunId, messages)
  // Everything the active run is parked on — permission grants AND questions.
  // Both stop the agent dead, so both belong on the live activity line.
  const cliBlockedOn = useMemo(
    () => [...blockedOnFromGrants(grants), ...capturesBlockedOn(answerableCaptures)],
    [grants, answerableCaptures],
  )
  const pending =
    !cliRunId && liveState.pendingAssistant
      ? { role: 'assistant' as const, content: liveState.pendingAssistant.content }
      : null

  const busy = isBusy ?? liveState.isSending
  const composerBlockers = useMemo(
    () => ({
      askShown: !!shownAsk,
      approvalShown: showApprovalPanel,
      historyLocked: !!historyLocked,
      inputOverridden: !!inputOverride,
    }),
    [shownAsk, showApprovalPanel, historyLocked, inputOverride],
  )
  usePendingAutoDispatch({
    chatId,
    queue: pendingQueue,
    busy,
    failed: !!liveState.sendError,
    blockers: composerBlockers,
  })

  const handleSend: ChatInputProps['onSend'] = async (text, attachments) => {
    if (busy && pendingQueue) {
      pendingQueue.enqueue({ text, attachments })
      return
    }
    await onSend(text, attachments)
  }
  const handleAbort = onAbort
    ? () => {
        pendingQueue?.pause()
        void onAbort()
      }
    : undefined

  // A turn's changes leave a marker where they happened; the decision on the
  // chat's open ones waits in the bar above the message box; the review opens
  // as a screen of its own.
  const reviewProjectId = onOpenReview ? projectId : undefined
  const openChanges = useChatOpenChanges(
    reviewProjectId && chatId && !isAgentRunChatKey(chatId)
      ? { projectId: reviewProjectId, chatContextId: chatId }
      : undefined,
  )
  const openRunId = openChanges.openChanges?.runId
  const openReview = useCallback(
    (runId?: string) => {
      const target = runId ?? openRunId
      if (target && onOpenReview) onOpenReview(target)
    },
    [openRunId, onOpenReview],
  )
  const chatActions = useMemo<ChatActions>(
    () => ({ openReview, draftMessage: onInputChange, ...(projectId ? { projectId } : {}) }),
    [openReview, onInputChange, projectId],
  )
  const receiptShas = useMemo(() => commitReceiptShas(decidedAsks), [decidedAsks])
  const renderChanges = useMemo(
    () =>
      reviewProjectId
        ? (runId: string) => (
            <ChatChangesMarkerConnected
              runId={runId}
              projectId={reviewProjectId}
              {...(openRunId ? { openRunId } : {})}
              receiptShas={receiptShas}
              onOpenReview={openReview}
            />
          )
        : undefined,
    [reviewProjectId, openRunId, openReview, receiptShas],
  )

  const pager = (ids: readonly string[], index: number, choose: (id?: string) => void) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Previous"
        onPress={() => choose(ids[index - 1])}
        disabled={index <= 0}
        style={{ opacity: index <= 0 ? 0.4 : 1 }}
      >
        <IconChevronLeft size={16} color={theme.text.secondary} />
      </Pressable>
      <Text style={{ fontSize: 12, fontVariant: ['tabular-nums'], color: theme.text.secondary }}>
        {QUESTION_PAGER(index + 1, ids.length)}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Next"
        onPress={() => choose(ids[index + 1])}
        disabled={index >= ids.length - 1}
        style={{ opacity: index >= ids.length - 1 ? 0.4 : 1 }}
      >
        <IconChevronRight size={16} color={theme.text.secondary} />
      </Pressable>
    </View>
  )
  const askPager = pager(
    openAsks.map((a) => a.id),
    shownIndex,
    setChosenAskId,
  )
  const approvalPager = pager(approvalIds, shownApprovalIndex, setChosenApprovalId)

  return (
    <ChatActionsProvider value={chatActions}>
      <View style={{ flex: 1, backgroundColor: theme.surface.base }}>
        {header}
        <View style={{ flex: 1 }}>
          <MessageList
            isBusy={isBusy}
            chatId={chatId}
            messages={messages}
            isThinking={liveState.isSending && !cliRunId}
            isSending={liveState.isSending}
            isDeleting={liveState.isDeleting === true}
            pending={pending}
            pendingCliRunId={cliRunId}
            pendingCliModel={liveState.cliModel ?? undefined}
            pendingCliStartedAt={liveState.cliStartedAt ?? undefined}
            cliBlockedOn={cliBlockedOn}
            cliAsks={grants}
            decidedAsks={decidedAsks}
            onClaimAsks={onClaimAsks}
            systemPrompt={systemPrompt}
            systemPromptTimestamp={systemPromptTimestamp}
            numberMessagesToSend={numberMessagesToSend}
            lastReadIso={lastReadIso}
            renderToolCall={renderToolCall}
            previewTool={previewTool}
            onResolveFile={onResolveFile}
            renderReference={renderReference}
            onResourceLink={onResourceLink}
            {...(chatTitle ? { chatTitle } : {})}
            attachmentImages={inputProps?.attachmentImages}
            renderCliRunArtifact={renderChanges}
            renderProcessRun={renderProcessRun}
            renderProcessGroupRun={renderProcessGroupRun}
            onShowUsage={onShowUsage}
            emptyStateContent={emptyStateContent}
            transcript={isAgentRunChatKey(chatId)}
            leadingContent={leadingContent}
            tailContent={
              shownDecidedLines.length > 0 || parkedAsks.length > 0 ? (
                <>
                  {shownDecidedLines.map(({ id, line }) => (
                    <ToolAskDecidedRow key={id} line={line} />
                  ))}
                  {parkedAsks.map((ask) =>
                    ask.kind === 'question' ? (
                      <StillWaitingRow
                        key={ask.id}
                        question={ask.grant.question.question}
                        onReopen={() => {
                          setAskParked(ask.id, false)
                          setChosenAskId(ask.id)
                        }}
                      />
                    ) : null,
                  )}
                </>
              ) : null
            }
            historyLocked={historyLocked}
            onDeleteLastMessage={onDeleteLastMessage ? () => void onDeleteLastMessage() : undefined}
            onRetry={onRetry ? () => void onRetry() : undefined}
            onRestartTurn={onRestartTurn ? () => void onRestartTurn() : undefined}
            onAtBottomChange={onAtBottomChange}
            onReadLatest={onReadLatest}
            scrollToBottomSignal={scrollToBottomSignal}
          />
        </View>
        {sendError && (
          <View style={{ paddingHorizontal: nativeSpace[5], paddingTop: nativeSpace[3] }}>
            <Alert variant="error">{sendError.message}</Alert>
          </View>
        )}
        {remedyGrants.length > 0 && (
          <View
            style={{
              paddingHorizontal: nativeSpace[5],
              paddingTop: nativeSpace[3],
              gap: nativeSpace[2],
            }}
          >
            {remedyGrants.map((grant) => (
              <RemedyCard key={grant.id} grant={grant} />
            ))}
          </View>
        )}
        <HeldAgentMessagesStack held={held} />
        {reviewProjectId ? (
          <ChatChangesBarConnected
            projectId={reviewProjectId}
            openChanges={openChanges}
            compact={!!shownAsk || showApprovalPanel}
            onReview={openReview}
          />
        ) : null}
        {/* A question or a credential form TAKES the composer rather than sitting
          above a live one: the agent's next step depends on the answer, so a
          free-text message sent past it would be typed into a conversation that
          is not listening. Answering, cancelling or "Not now" is the way back to
          typing. One ask at a time, paged — mirrors web. */}
        {shownAsk ? (
          <ScrollView
            style={{
              maxHeight: windowHeight * 0.66,
              flexGrow: 0,
              borderTopWidth: 1,
              borderTopColor: theme.border.default,
              backgroundColor: theme.surface.raised,
            }}
            contentContainerStyle={{
              paddingHorizontal: nativeSpace[3],
              paddingVertical: nativeSpace[3],
              gap: nativeSpace[2],
            }}
            keyboardShouldPersistTaps="handled"
          >
            {shownAsk.kind === 'question' ? (
              <AgentQuestionCard
                key={shownAsk.id}
                grant={shownAsk.grant}
                onPark={() => setAskParked(shownAsk.id, true)}
                {...(openAsks.length > 1 ? { pager: askPager } : {})}
              />
            ) : (
              <>
                {openAsks.length > 1 ? (
                  <View style={{ alignItems: 'flex-end' }}>{askPager}</View>
                ) : null}
                <CredentialCaptureCard
                  key={shownAsk.id}
                  capture={shownAsk.capture}
                  onSubmit={(fields) => onSubmitCredentialCapture!(shownAsk.id, fields)}
                  onCancel={() => onCancelCredentialCapture!(shownAsk.id)}
                />
              </>
            )}
          </ScrollView>
        ) : showApprovalPanel ? (
          <View>
            {approvalGrants.length > 1 ? (
              <View style={{ alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 8 }}>
                {approvalPager}
              </View>
            ) : null}
            {shownApproval ? (
              <ApprovalPanel
                key={shownApproval.id}
                grant={shownApproval}
                {...(projectId ? { projectId } : {})}
                {...(groupId ? { groupId } : {})}
                {...(chatTitle ? { chatTitle } : {})}
                {...(onResourceLink ? { onResourceLink } : {})}
                onDecideLater={() => setApprovalDismissedKey(approvalKey)}
                onDecided={(line) => addDecidedLine(shownApproval.id, line)}
                {...(renderApprovalModelChip ? { renderModelChip: renderApprovalModelChip } : {})}
                {...(renderProcessRun ? { renderProcessRun } : {})}
              />
            ) : null}
          </View>
        ) : historyLocked ? (
          // Parity with web: a closed chat keeps its history and takes no new work.
          <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>
              {
                '🔒 This chat is closed. Its history is kept as the record of how the work was done — start a new chat to carry on from here.'
              }
            </Text>
          </View>
        ) : (
          (inputOverride ?? (
            <>
              {pendingQueue ? <PendingMessagesStack queue={pendingQueue} busy={busy} /> : null}
              <ChatInput
                {...(inputProps ?? {})}
                value={inputValue}
                onChange={onInputChange}
                onSend={handleSend}
                onAbort={handleAbort}
                isThinking={busy}
                isConfigured={canSend}
                queueWhileThinking={!!pendingQueue}
              />
            </>
          ))
        )}
      </View>
    </ChatActionsProvider>
  )
}
