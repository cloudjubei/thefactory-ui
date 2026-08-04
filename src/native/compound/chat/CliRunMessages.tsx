import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { View } from 'react-native'

import { useAppSettings, useCliRunArtifact } from '../../../headless'
import { cliLabel, cliTranscriptToMessages, parseCliAgentModelTag } from '../../../headless/utils/cliRunner'
import type { ToolCallLike, ToolResultTypeLike } from '../../../headless/utils/chatTypes'
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
   * "Preparing …/first message slowest" copy; warm turns show plain "Working…". */
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
 * Native mirror of web's `CliRunMessages`: renders a CLI agent run as ordinary
 * chat messages (assistant + tool cards) via the standard {@link MessageRow},
 * so a CLI run looks identical to an API run. Streams live off the transcript,
 * shows a "Working…" line while active, and renders the diff/apply panel at the
 * end as the one CLI-specific extra.
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
}: CliRunMessagesProps) {
  const { transcript, status, notReady } = useCliRunArtifact(runId, undefined)
  const showThinking = useAppSettings().settings.userPreferences.cliShowThinking ?? true
  const streaming =
    status === 'running' || status === 'awaiting-approval' || status === 'paused'
  // Active = booting (record not written yet, the container spin-up) or
  // streaming; show "Preparing <agent>…" until the first transcript byte so the
  // long boot isn't a blank gap. Mirrors web.
  const active = notReady || streaming
  const booting = active && transcript.length === 0
  const cli = parseCliAgentModelTag(model)?.cli
  const messages = useMemo(
    () => cliTranscriptToMessages(transcript, { ...(model ? { model } : {}), showThinking }),
    [transcript, model, showThinking],
  )
  const total = baseIndex + messages.length + 1
  let shownModel = false

  // Live activity readout in the working spinner (mirrors web): ticking elapsed +
  // a running output-token estimate from the streamed assistant text.
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
  void tick
  const activitySuffix =
    elapsedS > 0 ? ` (${formatElapsed(elapsedS)}${approxTokens > 0 ? ` · ~${approxTokens} tokens` : ''})` : ''
  const spinnerLabel = booting && coldStart
    ? `Preparing ${cli ? cliLabel(cli) : 'the agent'}…${activitySuffix}`
    : `Working…${activitySuffix}`

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
          spinnerLabel={spinnerLabel}
          {...(booting && coldStart ? { spinnerSubLabel: CLI_BOOT_SUBLABEL } : {})}
        />
      ) : null}
      {renderCliRunArtifact ? renderCliRunArtifact(runId) : null}
    </View>
  )
}
