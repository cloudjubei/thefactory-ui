import { useMemo, type ReactNode } from 'react'
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
}

/** Reassurance shown under "Preparing <agent>…" — the container/CLI cold-start is
 * paid up-front, so the first turn is the slow one. */
const CLI_BOOT_SUBLABEL = 'The first message is slowest while the sandbox starts up.'

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
          {...(booting
            ? {
                spinnerLabel: `Preparing ${cli ? cliLabel(cli) : 'the agent'}…`,
                spinnerSubLabel: CLI_BOOT_SUBLABEL,
              }
            : {})}
        />
      ) : null}
      {renderCliRunArtifact ? renderCliRunArtifact(runId) : null}
    </View>
  )
}
