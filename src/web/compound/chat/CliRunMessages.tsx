import type { ReferenceTarget } from 'thefactory-tools/types'
import type { ResourceLink } from 'thefactory-tools/types'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

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
import { cliRowAsks, withAsksAwaitingOutcome } from '../../../headless/utils/pendingToolGrants'
import type { CliDecidedAsk, CliPendingAsk } from '../../../headless/utils/cliRunActivityTypes'
import type { PendingToolGrant } from '../../../headless/utils/chatTypes'
import type { ChatStopNotice } from '../../../headless/utils/chatStopNoticeTypes'
import { refuseWhileRunActive } from '../../../headless/utils/chatMessageDelete'
import { CLI_TURN_DELETE_ACTION_LABEL } from '../../../headless/utils/chatMessageDeleteConstants'
import type { MessageDeleteControl } from '../../../headless/utils/chatMessageDeleteTypes'
import { IconDelete } from '../../icons'
import type { UikitFileMeta } from '../files/FileDisplay'
import MessageRow from './MessageRow'
import ThinkingRow from './ThinkingRow'
import ToolApprovalFooter from './ToolApprovalFooter'
import type { ToolCall, ToolResultType } from './ToolCall'

export type CliRunMessagesProps = {
  /** The CLI run whose transcript to render as normal chat messages. */
  runId: string
  /** Model tag (`cli-agent/<tool>/<modelId>`) for the assistant messages' chip. */
  model?: string
  /** Index of this run's first derived message in the overall list (for keys/animation parity). */
  baseIndex: number
  renderToolResult?: (args: {
    toolCall: ToolCall
    result?: unknown
    resultType?: ToolResultType
    sideBySide?: boolean
  }) => ReactNode
  getToolHeaderPath?: (toolCall: ToolCall) => string | undefined
  onResolveFile?: (token: string) => UikitFileMeta | null
  renderReference?: (target: ReferenceTarget) => ReactNode | undefined
  /** Renders what the run changed, under its turn — `ChatBody` passes the changes marker. */
  renderCliRunArtifact?: (runId: string) => ReactNode
  /** Forwarded to each row: the live process run an announcement message launched. */
  renderProcessRun?: (processRunId: string) => ReactNode
  /** Forwarded to each row: the live group run an announcement launched. */
  renderProcessGroupRun?: (groupRunId: string) => ReactNode
  /**
   * True only for a genuine COLD start — the chat's first CLI run (turn 1), which
   * pays the container + CLI boot. Gates the "Preparing <agent>… / first message
   * is slowest" copy: on warm resident turns (≥2) the pre-output spinner is a
   * plain "Starting the turn…" instead of the misleading cold-start framing.
   */
  coldStart?: boolean
  /** The reply the chat stored for this turn — shown until the run record arrives. */
  storedReply?: string
  /** Why the turn stopped, as the chat stored it — shown as the stop card on the turn's last reply. */
  stopNotice?: ChatStopNotice
  /** Route an in-app `overseer://…` link (or a link into this app) the agent wrote, in place. */
  onResourceLink?: (link: ResourceLink) => void
  /**
   * What THIS run is waiting on the human for, from the chat's unified grant
   * feed. Drives the blocked activity line and re-types the tool row the run is
   * parked on, so "waiting for you" never renders identically to "working".
   */
  blockedOn?: readonly CliRunBlockedOn[]
  /**
   * The chat's undecided CLI asks. An ordinary tool ask this run's rows show is
   * decided on its row — toggle, "Always allow", and one Resume for the batch —
   * and reported through {@link onClaimAsks} so the approval panel leaves it out;
   * the row of a call waiting on a question or a launch just reads as waiting.
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
  /** True while the delete control is hovered — the WHOLE run goes, so the whole block lights. */
  deletePreview?: boolean
  /** Raised on hover/focus of the delete control so the list can light the range. */
  onDeletePreviewChange?: (active: boolean) => void
  /** A delete is still landing — the control spins and refuses a second press. */
  deleting?: boolean
}

/**
 * Renders a CLI agent run as ordinary chat messages — the run's transcript is
 * converted to the SAME `assistant` + `tool` message shape an API agent
 * produces and rendered through the standard {@link MessageRow}, so a CLI run
 * looks identical to an API run (no bespoke transcript view). Streams live off
 * the run's transcript; an activity line reports what the agent is doing right
 * now (booting / running a named tool / blocked on you); and the workspace
 * diff/apply panel renders at the end as the one CLI-specific extra.
 */
export default function CliRunMessages({
  runId,
  model,
  baseIndex,
  renderToolResult,
  getToolHeaderPath,
  onResolveFile,
  renderReference,
  renderCliRunArtifact,
  renderProcessRun,
  renderProcessGroupRun,
  coldStart = false,
  storedReply,
  stopNotice,
  onResourceLink,
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
  const { transcript, status, abortReason, notReady, startedAtMs, error, usage } =
    useCliRunArtifact(runId, undefined)
  const showThinking = useAppSettings().settings.userPreferences.cliShowThinking ?? true
  const streaming = isCliRunWorking(status)
  // The run is "active" (show the activity line) while it's booting (record not
  // written yet → `notReady`, the long container spin-up) or streaming.
  // `booting` holds until the first transcript byte lands, so there's never a
  // blank gap while the sandbox starts. A loaded terminal run shows neither.
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

  // "Not idling" proof, like VS Code / Cursor: the readout ticks once a second
  // while the run is active and times the CURRENT action — since the agent's
  // last transcript event, or the run's own start while it is still booting.
  // Run totals belong to the review, not the spinner line.
  const mountedAtRef = useRef<number | undefined>(undefined)
  const [, setTick] = useState(0)
  // Two deliberate acts to remove a turn — see the confirm below.
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
  const activity = describeCliRunActivity({
    runningToolNames: runningCliToolNames(messages),
    booting,
    coldStart,
    ...(cli ? { agentLabel: cliLabel(cli) } : {}),
    sinceLastActionMs,
    blocked: turnBlockedOn(blockedOn, cliAsks, approvals.askIds),
  })

  // The record's own verdict on whether the run is still going, so a turn
  // started before a reload still refuses deletion. `notReady` only counts while
  // the record fetch is still being retried — once it gives up it stays set, and
  // trusting it then would make the message permanently undeletable.
  const runActive = streaming || (notReady && error === undefined)
  const deleteAffordance = onDeleteTurn ? refuseWhileRunActive(deleteControl, runActive) : undefined

  // Half the regular message gap (the list uses space-y-3 = 12px) so a run's
  // tool/assistant steps read as a tight series rather than spread-out messages.
  return (
    // One CLI turn is ONE stored message that expands into this whole block, so
    // the delete preview lights the block entire — every step and the sign-off
    // panel with it.
    <div
      data-delete-preview={deletePreview || undefined}
      className={`group/cli-turn flex flex-col gap-1.5 ${
        deleting ? 'motion-safe:animate-chat-turn-leave' : ''
      }`}
    >
      {/* The tint marks WHAT WOULD GO. It deliberately stops short of the delete
          control below: a translucent wash over the button made it read as
          disabled, and the control that arms a destructive action must stay
          fully legible at all times. `outline` + a background tint only —
          changing the box would reflow the block under the cursor. */}
      <div
        className={`flex flex-col gap-1.5 ${
          deletePreview
            ? 'rounded-md bg-(--color-red-500)/8 outline outline-1 outline-(--color-red-500)/50'
            : ''
        }`}
      >
        {shown.map((m, i) => {
          // Show the model chip once, on the run's first assistant message —
          // matches API grouping (chip on the first assistant, not repeated).
          const showModel = !!model && m.role === 'assistant' && !shownModel
          if (showModel) shownModel = true
          return (
            <div key={`cli-${runId}-${i}`}>
              <MessageRow
                {...approvals.rowProps(m)}
                msg={{ ...m, showModel, isFirstInGroup: true }}
                onResourceLink={onResourceLink}
                globalIndex={baseIndex + i}
                totalMessages={total}
                isThinking={false}
                isLast={false}
                prevUserMessagesLen={0}
                enhancedTotalLength={total}
                renderToolResult={renderToolResult}
                renderProcessRun={renderProcessRun}
                renderProcessGroupRun={renderProcessGroupRun}
                getToolHeaderPath={getToolHeaderPath}
                onResolveFile={onResolveFile}
                renderReference={renderReference}
              />
            </div>
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
      </div>

      {deleteAffordance ? (
        <div
          className={`transition-opacity group-hover/cli-turn:opacity-100 focus-within:opacity-100 ${
            deletePreview || confirming ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {confirming ? (
            // Deleting a turn is irreversible and there is no undo, so it takes
            // TWO deliberate acts. A single mis-aimed click used to remove a
            // turn outright, and repeated clicks emptied whole chats.
            <div className="inline-flex items-center gap-2 rounded border border-(--color-red-500)/50 bg-(--color-red-500)/8 px-2 py-1">
              <span className="text-[11px] text-(--text-primary)">
                Delete this turn? It cannot be undone.
              </span>
              <button
                type="button"
                className="h-6 rounded border border-(--color-red-500) bg-(--color-red-500) px-2 text-[11px] font-medium text-white"
                onClick={() => {
                  setConfirming(false)
                  onDeletePreviewChange?.(false)
                  onDeleteTurn?.()
                }}
              >
                Delete turn
              </button>
              <button
                type="button"
                className="h-6 rounded px-2 text-[11px] text-(--text-secondary) hover:text-(--text-primary)"
                onClick={() => {
                  setConfirming(false)
                  onDeletePreviewChange?.(false)
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              title={deleteAffordance.label}
              aria-label={deleteAffordance.label}
              className="inline-flex items-center gap-1.5 h-6 px-2 rounded border border-(--border-subtle) bg-(--surface-raised) hover:bg-(--surface-hover) text-[11px] text-(--text-secondary) disabled:cursor-not-allowed disabled:hover:bg-(--surface-raised)"
              onClick={() => setConfirming(true)}
              onMouseEnter={() => onDeletePreviewChange?.(true)}
              onMouseLeave={() => onDeletePreviewChange?.(false)}
              onFocus={() => onDeletePreviewChange?.(true)}
              onBlur={() => onDeletePreviewChange?.(false)}
              disabled={deleteAffordance.disabled || deleting}
            >
              {deleting ? (
                <span
                  aria-hidden
                  className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                />
              ) : (
                <IconDelete className="w-3.5 h-3.5" />
              )}
              <span>{deleting ? 'Deleting…' : CLI_TURN_DELETE_ACTION_LABEL}</span>
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}
