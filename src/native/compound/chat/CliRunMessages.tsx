import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'

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
import type { ToolCallLike, ToolResultTypeLike } from '../../../headless/utils/chatTypes'
import { refuseWhileRunActive } from '../../../headless/utils/chatMessageDelete'
import { CLI_TURN_DELETE_ACTION_LABEL } from '../../../headless/utils/chatMessageDeleteConstants'
import type { MessageDeleteControl } from '../../../headless/utils/chatMessageDeleteTypes'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconDelete } from '../../icons'
import type { UikitFileMeta } from '../files/FileDisplay'
import MessageRow from './MessageRow'
import ThinkingRow from './ThinkingRow'

export type CliRunMessagesProps = {
  /** The CLI run whose transcript to render as normal chat messages. */
  runId: string
  /** Model tag (`cli-agent/<tool>/<modelId>`) for the assistant messages' chip. */
  model?: string
  /** Index of this run's first derived message in the overall list. */
  baseIndex: number
  renderToolCall?: (args: {
    toolCall: ToolCallLike
    result?: unknown
    resultType?: ToolResultTypeLike
    durationMs?: number
  }) => ReactNode
  onResolveFile?: (token: string) => UikitFileMeta | null
  renderDependency?: (dep: string) => ReactNode
  /** Renders the workspace diff/apply panel for the run (host-wired, carries projectId). */
  renderCliRunArtifact?: (runId: string) => ReactNode
  /** True only for the chat's first CLI run (turn 1, cold boot). Gates the
   * "Preparing …/first message slowest" copy; warm turns show a plain start line. */
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
  renderDependency,
  renderCliRunArtifact,
  coldStart = false,
  blockedOn,
  onDeleteTurn,
  deleteControl,
}: CliRunMessagesProps) {
  const { theme } = useNativeTheme()
  const { transcript, status, notReady, startedAtMs, error } = useCliRunArtifact(runId, undefined)
  const showThinking = useAppSettings().settings.userPreferences.cliShowThinking ?? true
  const streaming = status === 'running' || status === 'awaiting-approval' || status === 'paused'
  // Active = booting (record not written yet, the container spin-up) or
  // streaming; `booting` holds until the first transcript byte so the long boot
  // isn't a blank gap. Mirrors web.
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

  // Elapsed readout, ticking once a second while active. Measured from the RUN's
  // own start once the record loads, so a screen opened mid-turn reports the
  // real age of the turn rather than restarting from zero. Mirrors web.
  const mountedAtRef = useRef<number | undefined>(undefined)
  const [, setTick] = useState(0)
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
    elapsedMs,
    approxTokens: approxCliOutputTokens(messages),
    blocked: blockedOn ?? [],
  })

  return (
    <View style={{ gap: 6 }}>
      {messages.map((m, i) => {
        const showModel = !!model && m.role === 'assistant' && !shownModel
        if (showModel) shownModel = true
        return (
          <MessageRow
            key={`cli-${runId}-${i}`}
            msg={{ ...m, showModel, isFirstInGroup: true }}
            globalIndex={baseIndex + i}
            totalMessages={total}
            isThinking={false}
            isLast={false}
            prevUserMessagesLen={0}
            enhancedTotalLength={total}
            renderToolCall={renderToolCall}
            onResolveFile={onResolveFile}
            renderDependency={renderDependency}
          />
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
      {deleteAffordance ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={deleteAffordance.label}
          onPress={onDeleteTurn}
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
          <IconDelete size={12} color={theme.text.secondary} />
          <Text style={{ fontSize: 11, color: theme.text.secondary }}>
            {CLI_TURN_DELETE_ACTION_LABEL}
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}
