import { useMemo, type ReactNode } from 'react'

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
          {...(booting
            ? { spinnerLabel: `Preparing ${cli ? cliLabel(cli) : 'the agent'}…` }
            : {})}
        />
      ) : null}
      {renderCliRunArtifact ? renderCliRunArtifact(runId) : null}
    </div>
  )
}
