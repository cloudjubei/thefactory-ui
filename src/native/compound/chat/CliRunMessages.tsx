import type { ReferenceTarget } from 'thefactory-tools/types'
import type { ResourceLink } from 'thefactory-tools/types'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'

import { useAppSettings, useCliRunArtifact, useInlineApprovals } from '../../../headless'
import {
  describeCliRunActivity,
  isCliRunWorking,
  turnBlockedOn,
  lastCliActionAtMs,
  runningCliToolNames,
} from '../../../headless/utils/cliRunActivity'
import { CLI_ELAPSED_TICK_MS } from '../../../headless/utils/cliRunActivityConstants'
import type { CliRunBlockedOn } from '../../../headless/utils/cliRunActivityTypes'
import {
  cliLabel,
  cliTranscriptToMessages,
  parseCliAgentModelTag,
  withCliRunFailure,
  withCliStopNotice,
  withStoredCliReply,
} from '../../../headless/utils/cliRunner'
import type { ChatMessageLike, PendingToolGrant } from '../../../headless/utils/chatTypes'
import type { ChatStopNotice } from '../../../headless/utils/chatStopNoticeTypes'
import { cliRowAsks, withAsksAwaitingOutcome } from '../../../headless/utils/pendingToolGrants'
import type { CliDecidedAsk, CliPendingAsk } from '../../../headless/utils/cliRunActivityTypes'
import { refuseWhileRunActive } from '../../../headless/utils/chatMessageDelete'
import { CLI_TURN_DELETE_ACTION_LABEL } from '../../../headless/utils/chatMessageDeleteConstants'
import type { MessageDeleteControl } from '../../../headless/utils/chatMessageDeleteTypes'
import { nativeAlpha, nativePalette, nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconDelete } from '../../icons'
import type { UikitFileMeta } from '../files/FileDisplay'
import MessageRow from './MessageRow'
import ToolApprovalFooter from './ToolApprovalFooter'
import ThinkingRow from './ThinkingRow'
import type { NativeToolCallRenderArgs } from './chatNativeTypes'

export type CliRunMessagesProps = {
  /** The CLI run whose transcript to render as normal chat messages. */
  runId: string
  /** Model tag (`cli-agent/<tool>/<modelId>`) for the assistant messages' chip. */
  model?: string
  /** Index of this run's first derived message in the overall list. */
  baseIndex: number
  renderToolCall?: (args: NativeToolCallRenderArgs) => ReactNode
  onResolveFile?: (token: string) => UikitFileMeta | null
  renderReference?: (target: ReferenceTarget) => ReactNode | undefined
  /** Renders what the run changed, under its turn — `ChatBody` passes the changes marker. */
  renderCliRunArtifact?: (runId: string) => ReactNode
  /** Forwarded to each row: the live process run an announcement message launched. */
  renderProcessRun?: (processRunId: string) => ReactNode
  /** Forwarded to each row: the live group run an announcement launched. */
  renderProcessGroupRun?: (groupRunId: string) => ReactNode
  /** Opens a message's usage sheet from its `$` chip — a CLI turn's usage, $0 or not, included. */
  onShowUsage?: (msg: ChatMessageLike) => void
  /** True only for the chat's first CLI run (turn 1, cold boot). Gates the
   * "Preparing …/first message slowest" copy; warm turns show a plain start line. */
  coldStart?: boolean
  /** The reply the chat stored for this turn — shown until the run record arrives. */
  storedReply?: string
  /** Why the turn stopped, as the chat stored it — shown as the stop card on the turn's last reply. */
  stopNotice?: ChatStopNotice
  /** Route an in-app `overseer://…` link (or a link into this app) the agent wrote, in place. */
  onResourceLink?: (link: ResourceLink) => void
  /** This chat's display name — forwarded to tool rows for sendChatMessage sender labels. */
  chatTitle?: string
  /**
   * What THIS run is waiting on the human for, from the chat's unified grant
   * feed. Drives the blocked activity line and re-types the tool row the run is
   * parked on, so "waiting for you" never renders identically to "working".
   */
  blockedOn?: readonly CliRunBlockedOn[]
  /**
   * The chat's undecided CLI asks. An ordinary tool ask this run's rows show is
   * decided on its row — toggle, "Always allow", one Resume — and reported
   * through {@link onClaimAsks} so the approval panel leaves it out; the row of a
   * call waiting on a question or a launch just reads as waiting. Mirrors web.
   */
  cliAsks?: readonly PendingToolGrant[]
  /** The chat's decided asks — what a row that once waited on one shows now. */
  decidedAsks?: readonly CliDecidedAsk[]
  /** The asks the chat stores rows of its own for — a call raising one is left to that row. */
  storedAskIds?: ReadonlySet<string>
  /** Which of {@link cliAsks} this run's rows show; `[]` once it no longer shows any. */
  onClaimAsks?: (runId: string, askIds: string[], settled?: boolean) => void
  /**
   * Removes the whole turn — the stored assistant message that owns this run.
   * The rows above are derived from the run record and have no message of their
   * own, so the turn is the only honest unit of deletion here.
   */
  onDeleteTurn?: () => void
  /** Label + refusal for {@link onDeleteTurn}, from `describeLastMessageDelete`. */
  deleteControl?: MessageDeleteControl
  /** True while the delete control is held — the WHOLE run goes, so the whole block lights. */
  deletePreview?: boolean
  /** Raised while the delete control is held so the list can light the range. */
  onDeletePreviewChange?: (active: boolean) => void
  /** A delete is still landing — the control spins and refuses a second press. */
  deleting?: boolean
}

/**
 * Native mirror of web's `CliRunMessages`: renders a CLI agent run as ordinary
 * chat messages (assistant + tool cards) via the standard {@link MessageRow},
 * so a CLI run looks identical to an API run. Streams live off the transcript,
 * reports what the agent is doing right now (booting / running a named tool /
 * blocked on you), and renders the diff/apply panel at the end as the one
 * CLI-specific extra.
 */
export default function CliRunMessages({
  runId,
  model,
  baseIndex,
  renderToolCall,
  onResolveFile,
  renderReference,
  renderCliRunArtifact,
  renderProcessRun,
  renderProcessGroupRun,
  onShowUsage,
  coldStart = false,
  storedReply,
  stopNotice,
  onResourceLink,
  chatTitle,
  blockedOn,
  cliAsks,
  decidedAsks,
  storedAskIds,
  onClaimAsks,
  onDeleteTurn,
  deleteControl,
  deletePreview = false,
  onDeletePreviewChange,
  deleting = false,
}: CliRunMessagesProps) {
  const { theme } = useNativeTheme()
  const { transcript, status, abortReason, notReady, startedAtMs, error, usage } =
    useCliRunArtifact(runId, undefined)
  const showThinking = useAppSettings().settings.userPreferences.cliShowThinking ?? true
  const streaming = isCliRunWorking(status)
  // Active = booting (record not written yet, the container spin-up) or
  // streaming; `booting` holds until the first transcript byte so the long boot
  // isn't a blank gap. Mirrors web.
  const active = notReady || streaming
  const booting = active && transcript.length === 0
  const cli = parseCliAgentModelTag(model)?.cli
  const rowAsks = useMemo(() => cliRowAsks(cliAsks), [cliAsks])
  const decidedIds = useMemo(() => new Set((decidedAsks ?? []).map((a) => a.id)), [decidedAsks])
  // An ask leaves the pending list the moment it is decided here, before its
  // decision arrives — held as under way meanwhile (see withAsksAwaitingOutcome).
  const shownAsksRef = useRef<CliPendingAsk[]>([])
  const pendingAsks = useMemo(
    () => withAsksAwaitingOutcome(rowAsks, shownAsksRef.current, decidedIds),
    [rowAsks, decidedIds],
  )
  shownAsksRef.current = pendingAsks
  const messages = useMemo(
    () =>
      withCliRunFailure(
        cliTranscriptToMessages(transcript, {
          ...(model ? { model } : {}),
          showThinking,
          pendingAsks,
          ...(decidedAsks ? { decidedAsks } : {}),
          runId,
          ...(usage ? { usage } : {}),
          ...(storedAskIds ? { storedAskIds } : {}),
          runEnded: status !== undefined && !isCliRunWorking(status),
        }),
        status,
        abortReason,
      ),
    [
      transcript,
      model,
      showThinking,
      pendingAsks,
      decidedAsks,
      runId,
      usage,
      storedAskIds,
      status,
      abortReason,
    ],
  )
  // Its rows are known once the record has loaded, failed to, or is still being
  // written (booting shows no rows to wait for) — until then the panel holds
  // this turn's asks back rather than flash them up as cards.
  const settled = status !== undefined || error !== undefined || notReady || transcript.length > 0
  const approvals = useInlineApprovals(runId, messages, cliAsks, onClaimAsks, settled)
  const shown = useMemo(
    () =>
      withCliStopNotice(
        withStoredCliReply(messages, { content: storedReply, ...(model ? { model } : {}) }, active),
        active ? undefined : stopNotice,
        storedReply,
      ),
    [messages, storedReply, model, active, stopNotice],
  )
  const total = baseIndex + shown.length + 1
  let shownModel = false

  // Since-last-action readout, ticking once a second while active: times the
  // CURRENT action from the agent's last transcript event, or from the run's own
  // start while it is still booting. Mirrors web.
  const mountedAtRef = useRef<number | undefined>(undefined)
  const [, setTick] = useState(0)
  // Two deliberate acts to remove a turn: the first press arms, the second commits.
  const [confirming, setConfirming] = useState(false)
  useEffect(() => {
    if (!active) {
      mountedAtRef.current = undefined
      return
    }
    if (mountedAtRef.current === undefined) mountedAtRef.current = Date.now()
    const id = setInterval(() => setTick((t) => t + 1), CLI_ELAPSED_TICK_MS)
    return () => clearInterval(id)
  }, [active])
  const lastActionAt = lastCliActionAtMs(transcript, startedAtMs ?? mountedAtRef.current)
  const sinceLastActionMs = active && lastActionAt !== undefined ? Date.now() - lastActionAt : 0
  // The record's own verdict on whether the run is still going, so a turn
  // started before a reload still refuses deletion. `notReady` only counts while
  // the record fetch is still being retried — once it gives up it stays set, and
  // trusting it then would make the message permanently undeletable.
  const runActive = streaming || (notReady && error === undefined)
  const deleteAffordance = onDeleteTurn ? refuseWhileRunActive(deleteControl, runActive) : undefined
  const activity = describeCliRunActivity({
    runningToolNames: runningCliToolNames(messages),
    booting,
    coldStart,
    ...(cli ? { agentLabel: cliLabel(cli) } : {}),
    sinceLastActionMs,
    blocked: turnBlockedOn(blockedOn, cliAsks, approvals.askIds),
  })

  return (
    // One CLI turn is ONE stored message that expands into this whole block, so
    // the delete preview lights the block entire.
    <View style={{ gap: 6 }}>
      {/* The tint marks WHAT WOULD GO and deliberately stops short of the delete
          control below: a wash over the control made it read as disabled. Tint
          only — a border or padding would reflow the block under the finger. */}
      <View
        style={{
          gap: 6,
          ...(deletePreview
            ? {
                borderRadius: nativeRadii[2],
                backgroundColor: nativeAlpha(nativePalette.red[500], 0.1),
              }
            : {}),
        }}
      >
        {shown.map((m, i) => {
          const showModel = !!model && m.role === 'assistant' && !shownModel
          if (showModel) shownModel = true
          return (
            <MessageRow
              key={`cli-${runId}-${i}`}
              {...approvals.rowProps(m)}
              msg={{ ...m, showModel, isFirstInGroup: true }}
              onResourceLink={onResourceLink}
              {...(chatTitle ? { chatTitle } : {})}
              globalIndex={baseIndex + i}
              totalMessages={total}
              isThinking={false}
              isLast={false}
              prevUserMessagesLen={0}
              enhancedTotalLength={total}
              renderToolCall={renderToolCall}
              renderProcessRun={renderProcessRun}
              renderProcessGroupRun={renderProcessGroupRun}
              onResolveFile={onResolveFile}
              renderReference={renderReference}
              onShowUsage={onShowUsage}
            />
          )
        })}
        {approvals.askIds.length > 0 ? (
          <ToolApprovalFooter
            total={approvals.askIds.length}
            selectedCount={approvals.selectedCount}
            allSelected={approvals.allSelected}
            onToggleAll={approvals.toggleAll}
            onResume={() => void approvals.resume()}
            resuming={approvals.resuming}
          />
        ) : null}
        {active ? (
          <ThinkingRow
            spinnerLabel={activity.label}
            tone={activity.tone === 'blocked' ? 'blocked' : 'working'}
            {...(activity.sublabel ? { spinnerSubLabel: activity.sublabel } : {})}
          />
        ) : null}
        {renderCliRunArtifact ? renderCliRunArtifact(runId) : null}
      </View>
      {deleteAffordance ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={deleteAffordance.label}
          onPress={() => {
            // Two deliberate acts: the first arms, the second commits. A single
            // mis-aimed press used to remove a turn outright.
            if (!confirming) {
              setConfirming(true)
              return
            }
            setConfirming(false)
            onDeletePreviewChange?.(false)
            onDeleteTurn?.()
          }}
          onPressIn={() => onDeletePreviewChange?.(true)}
          onPressOut={() => onDeletePreviewChange?.(confirming)}
          disabled={deleteAffordance.disabled}
          hitSlop={4}
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: nativeSpace[2],
            height: 26,
            paddingHorizontal: nativeSpace[4],
            borderRadius: nativeRadii[1],
            borderWidth: 1,
            borderColor: theme.border.subtle,
            backgroundColor: pressed ? theme.surface.muted : theme.surface.raised,
            opacity: deleteAffordance.disabled ? 0.4 : 1,
          })}
        >
          {deleting ? (
            <ActivityIndicator size="small" color={theme.text.secondary} />
          ) : (
            <IconDelete size={12} color={theme.text.secondary} />
          )}
          <Text style={{ fontSize: 11, color: theme.text.secondary }}>
            {deleting
              ? 'Deleting…'
              : confirming
                ? 'Tap again to delete — cannot be undone'
                : CLI_TURN_DELETE_ACTION_LABEL}
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}
