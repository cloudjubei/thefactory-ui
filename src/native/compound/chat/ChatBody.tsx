import type { ReferenceTarget } from 'thefactory-tools/types'
import { useMemo, useState, type ReactNode } from 'react'
import { Text, View } from 'react-native'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
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
import { partitionGrants, shownQuestionId, userAsks } from '../../../headless/utils/agentQuestions'
import { panelApprovalGrants } from '../../../headless/utils/approvalGrant'
import { useClaimedAsks } from '../../../headless/hooks/useInlineApprovals'
import { useHeldAgentMessages } from '../../../headless/hooks/useHeldAgentMessages'
import { useShownLiveRun } from '../../../headless/hooks/useShownLiveRun'
import { useChatDecidedAsks } from '../../../headless/hooks/useChatDecidedAsks'
import { blockedOnFromGrants } from '../../../headless/utils/cliRunActivity'
import { capturesBlockedOn } from '../../../headless/utils/credentialCaptures'
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

export interface ChatBodyProps {
  chatId?: string
  /** The chat's project, forwarded to the launch approval so it can resolve the
   * process proposal a user reads before approving. */
  projectId?: string
  /** The chat's group, forwarded to a launch across the group's projects. */
  groupId?: string
  /** Caller-rendered header (typically `<ChatHeader />`). When omitted no
   * header section is rendered. */
  header?: ReactNode

  /** Optional banner for send-side errors. */
  sendError?: { message: string } | null

  /** When provided, replaces the standard chat input (e.g. for read-only
   * agent-run chats). */
  inputOverride?: ReactNode

  /** When true, the composer (and any `inputOverride`) is not rendered at all —
   * the canvas is action-only (e.g. a pending feature-request chat whose only
   * actions live in the centered `emptyStateContent`). */
  hideInput?: boolean

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

  onResolveFile?: (token: string) => UikitFileMeta | null
  renderReference?: (target: ReferenceTarget) => ReactNode | undefined
  /** Route an in-app `overseer://…` resource link. Forwarded to MessageList (F.2). */
  onResourceLink?: (link: ResourceLink) => void
  /** Render the workspace-diff panel for a CLI-agent reply. Forwarded to MessageList. */
  renderCliRunArtifact?: (runId: string) => ReactNode
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

export default function ChatBody({
  chatId,
  header,
  sendError,
  inputOverride,
  hideInput,
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
  onResolveFile,
  renderReference,
  onResourceLink,
  renderCliRunArtifact,
  renderProcessRun,
  renderProcessGroupRun,
  projectId,
  groupId,
  onShowUsage,
  emptyStateContent,
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
  const [chosenAskId, setChosenAskId] = useState<string>()
  const shownAskKey = shownQuestionId(
    asks.map((a) => a.id),
    chosenAskId,
  )
  const shownIndex = asks.findIndex((a) => a.id === shownAskKey)
  const shownAsk = shownIndex >= 0 ? asks[shownIndex] : undefined
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
  const approvalGrants = useMemo(
    () => panelApprovalGrants(grants, claimedAskIds, { loading: messagesLoading, unsettledRunIds }),
    [grants, claimedAskIds, messagesLoading, unsettledRunIds],
  )
  const approvalKey = approvalGrants.map((g) => g.id).join('|')
  const [approvalDismissedKey, setApprovalDismissedKey] = useState<string | null>(null)
  const showApprovalPanel = approvalGrants.length > 0 && approvalKey !== approvalDismissedKey
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
      approvalShown: !hideInput && showApprovalPanel,
      historyLocked: !!historyLocked,
      inputOverridden: !!inputOverride,
      inputHidden: !!hideInput,
    }),
    [shownAsk, hideInput, showApprovalPanel, historyLocked, inputOverride],
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

  return (
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
          onResolveFile={onResolveFile}
          renderReference={renderReference}
          onResourceLink={onResourceLink}
          renderCliRunArtifact={renderCliRunArtifact}
          renderProcessRun={renderProcessRun}
          renderProcessGroupRun={renderProcessGroupRun}
          onShowUsage={onShowUsage}
          emptyStateContent={emptyStateContent}
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
      {/* A question or a credential form TAKES the composer rather than sitting
          above a live one: the agent's next step depends on the answer, so a
          free-text message sent past it would be typed into a conversation that
          is not listening. Cancelling it is the way back to typing anything.

          It outranks `hideInput` deliberately: a parked ask waits forever, so a
          surface that hides the composer must not hide its only release. */}
      {shownAsk ? (
        <View
          style={{
            paddingHorizontal: nativeSpace[3],
            paddingVertical: nativeSpace[3],
            gap: nativeSpace[2],
            borderTopWidth: 1,
            borderTopColor: theme.border.subtle,
          }}
        >
          {asks.length > 1 ? (
            // One ask at a time, paged — mirrors web.
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: nativeSpace[2],
              }}
            >
              <Button
                variant="secondary"
                size="icon"
                accessibilityLabel="Previous"
                onPress={() => setChosenAskId(asks[shownIndex - 1]?.id)}
                disabled={shownIndex === 0}
              >
                <IconChevronLeft size={16} color={theme.text.primary} />
              </Button>
              <Text
                style={{
                  fontSize: 12,
                  fontVariant: ['tabular-nums'],
                  color: theme.text.secondary,
                }}
              >
                {shownIndex + 1} of {asks.length} waiting on you
              </Text>
              <Button
                variant="secondary"
                size="icon"
                accessibilityLabel="Next"
                onPress={() => setChosenAskId(asks[shownIndex + 1]?.id)}
                disabled={shownIndex === asks.length - 1}
              >
                <IconChevronRight size={16} color={theme.text.primary} />
              </Button>
            </View>
          ) : null}
          {shownAsk.kind === 'question' ? (
            <AgentQuestionCard key={shownAsk.id} grant={shownAsk.grant} />
          ) : (
            <CredentialCaptureCard
              key={shownAsk.id}
              capture={shownAsk.capture}
              onSubmit={(fields) => onSubmitCredentialCapture!(shownAsk.id, fields)}
              onCancel={() => onCancelCredentialCapture!(shownAsk.id)}
            />
          )}
        </View>
      ) : hideInput ? null : showApprovalPanel ? (
        <View>
          {approvalGrants.map((grant) => (
            <ApprovalPanel
              key={grant.id}
              grant={grant}
              {...(projectId ? { projectId } : {})}
              {...(groupId ? { groupId } : {})}
              onDecideLater={() => setApprovalDismissedKey(approvalKey)}
            />
          ))}
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
  )
}
