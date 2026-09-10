import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { useAppSettings, useCliRunArtifact } from '../../../headless'
import {
  approxCliOutputTokens,
  blockedToolNames,
  describeCliRunActivity,
  runningCliToolNames,
} from '../../../headless/utils/cliRunActivity'
import { CLI_ELAPSED_TICK_MS } from '../../../headless/utils/cliRunActivityConstants'
import type { CliRunBlockedOn } from '../../../headless/utils/cliRunActivityTypes'
import {
  cliLabel,
  cliTranscriptToMessages,
  parseCliAgentModelTag,
} from '../../../headless/utils/cliRunner'
import { refuseWhileRunActive } from '../../../headless/utils/chatMessageDelete'
import { CLI_TURN_DELETE_ACTION_LABEL } from '../../../headless/utils/chatMessageDeleteConstants'
import type { MessageDeleteControl } from '../../../headless/utils/chatMessageDeleteTypes'
import { IconDelete } from '../../icons'
import type { UikitFileMeta } from '../files/FileDisplay'
import MessageRow from './MessageRow'
import ThinkingRow from './ThinkingRow'
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
  renderDependency?: (dep: string) => ReactNode
  /** Renders the workspace diff/apply panel for the run (host-wired, carries projectId). */
  renderCliRunArtifact?: (runId: string) => ReactNode
  /**
   * True only for a genuine COLD start — the chat's first CLI run (turn 1), which
   * pays the container + CLI boot. Gates the "Preparing <agent>… / first message
   * is slowest" copy: on warm resident turns (≥2) the pre-output spinner is a
   * plain "Starting the turn…" instead of the misleading cold-start framing.
   */
  coldStart?: boolean
  /**
   * What THIS run is waiting on the human for, from the chat's unified grant
   * feed. Drives the blocked activity line and re-types the tool row the run is
   * parked on, so "waiting for you" never renders identically to "working".
   */
  blockedOn?: readonly CliRunBlockedOn[]
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
  renderDependency,
  renderCliRunArtifact,
  coldStart = false,
  blockedOn,
  onDeleteTurn,
  deleteControl,
  deletePreview = false,
  onDeletePreviewChange,
  deleting = false,
}: CliRunMessagesProps) {
  const { transcript, status, notReady, startedAtMs, error } = useCliRunArtifact(runId, undefined)
  const showThinking = useAppSettings().settings.userPreferences.cliShowThinking ?? true
  const streaming = status === 'running' || status === 'awaiting-approval' || status === 'paused'
  // The run is "active" (show the activity line) while it's booting (record not
  // written yet → `notReady`, the long container spin-up) or streaming.
  // `booting` holds until the first transcript byte lands, so there's never a
  // blank gap while the sandbox starts. A loaded terminal run shows neither.
  const active = notReady || streaming
  const booting = active && transcript.length === 0
  const cli = parseCliAgentModelTag(model)?.cli
  const awaitingApprovalToolNames = useMemo(() => blockedToolNames(blockedOn ?? []), [blockedOn])
  const messages = useMemo(
    () =>
      cliTranscriptToMessages(transcript, {
        ...(model ? { model } : {}),
        showThinking,
        awaitingApprovalToolNames,
      }),
    [transcript, model, showThinking, awaitingApprovalToolNames],
  )
  const total = baseIndex + messages.length + 1
  let shownModel = false

  // "Not idling" proof, like VS Code / Cursor: the elapsed readout ticks once a
  // second while the run is active. It measures from the RUN's own start when
  // the record has loaded, so a page opened mid-turn reports the real age of the
  // turn rather than restarting from zero.
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
  const startedAt = startedAtMs ?? mountedAtRef.current
  const elapsedMs = active && startedAt !== undefined ? Date.now() - startedAt : 0
  const activity = describeCliRunActivity({
    runningToolNames: runningCliToolNames(messages),
    booting,
    coldStart,
    ...(cli ? { agentLabel: cliLabel(cli) } : {}),
    elapsedMs,
    approxTokens: approxCliOutputTokens(messages),
    blocked: blockedOn ?? [],
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
        {messages.map((m, i) => {
          // Show the model chip once, on the run's first assistant message —
          // matches API grouping (chip on the first assistant, not repeated).
          const showModel = !!model && m.role === 'assistant' && !shownModel
          if (showModel) shownModel = true
          return (
            <div key={`cli-${runId}-${i}`}>
              <MessageRow
                msg={{ ...m, showModel, isFirstInGroup: true }}
                globalIndex={baseIndex + i}
                totalMessages={total}
                isThinking={false}
                isLast={false}
                prevUserMessagesLen={0}
                enhancedTotalLength={total}
                renderToolResult={renderToolResult}
                getToolHeaderPath={getToolHeaderPath}
                onResolveFile={onResolveFile}
                renderDependency={renderDependency}
              />
            </div>
          )
        })}
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
