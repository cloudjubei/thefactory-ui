import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { useAppSettings, useCliRunArtifact } from '../../../headless'
import { cliLabel, cliTranscriptToMessages, parseCliAgentModelTag } from '../../../headless/utils/cliRunner'
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
   * plain "Working…" instead of the misleading cold-start framing.
   */
  coldStart?: boolean
}

/** Reassurance shown under "Preparing <agent>…" — the container/CLI cold-start is
 * paid up-front, so the first turn is the slow one. */
const CLI_BOOT_SUBLABEL = 'The first message is slowest while the sandbox starts up.'

/** "12s" under a minute, "1m 05s" beyond — the live elapsed readout in the spinner. */
function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`
}

/**
 * Renders a CLI agent run as ordinary chat messages — the run's transcript is
 * converted to the SAME `assistant` + `tool` message shape an API agent
 * produces and rendered through the standard {@link MessageRow}, so a CLI run
 * looks identical to an API run (no bespoke transcript view). Streams live off
 * the run's transcript; a "Working…" line shows while the run is active; and the
 * workspace diff/apply panel renders at the end as the one CLI-specific extra.
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
}: CliRunMessagesProps) {
  const { transcript, status, notReady } = useCliRunArtifact(runId, undefined)
  const showThinking = useAppSettings().settings.userPreferences.cliShowThinking ?? true
  const streaming =
    status === 'running' || status === 'awaiting-approval' || status === 'paused'
  // The run is "active" (show a spinner) while it's booting (record not written
  // yet → `notReady`, the long container spin-up) or streaming. `booting` shows
  // the "Preparing <agent>…" label until the first transcript byte lands — so
  // there's never a blank gap while the sandbox starts; after that it's the
  // plain working spinner like the API path. A loaded terminal run shows neither.
  const active = notReady || streaming
  const booting = active && transcript.length === 0
  const cli = parseCliAgentModelTag(model)?.cli
  const messages = useMemo(
    () => cliTranscriptToMessages(transcript, { ...(model ? { model } : {}), showThinking }),
    [transcript, model, showThinking],
  )
  const total = baseIndex + messages.length + 1
  let shownModel = false

  // Live activity readout in the working spinner — "not idling" proof, like VS
  // Code / Cursor: a ticking elapsed timer plus a running output-token estimate
  // derived from the streamed assistant text (~4 chars/token). The timer re-ticks
  // once per second only while active.
  const startRef = useRef<number | undefined>(undefined)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!active) {
      startRef.current = undefined
      return
    }
    if (startRef.current === undefined) startRef.current = Date.now()
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [active])
  const approxTokens = useMemo(() => {
    let chars = 0
    for (const m of messages) if (m.role === 'assistant' && typeof m.content === 'string') chars += m.content.length
    return Math.floor(chars / 4)
  }, [messages])
  const elapsedS = active && startRef.current !== undefined ? Math.floor((Date.now() - startRef.current) / 1000) : 0
  void tick // re-render dependency for the elapsed readout
  const activitySuffix =
    elapsedS > 0 ? ` (${formatElapsed(elapsedS)}${approxTokens > 0 ? ` · ~${approxTokens} tokens` : ''})` : ''
  const spinnerLabel = booting
    ? coldStart
      ? `Preparing ${cli ? cliLabel(cli) : 'the agent'}…${activitySuffix}`
      : `Working…${activitySuffix}`
    : `Working…${activitySuffix}`

  // Half the regular message gap (the list uses space-y-3 = 12px) so a run's
  // tool/assistant steps read as a tight series rather than spread-out messages.
  return (
    <div className="flex flex-col gap-1.5">
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
          spinnerLabel={spinnerLabel}
          {...(booting && coldStart ? { spinnerSubLabel: CLI_BOOT_SUBLABEL } : {})}
        />
      ) : null}
      {renderCliRunArtifact ? renderCliRunArtifact(runId) : null}
    </div>
  )
}
