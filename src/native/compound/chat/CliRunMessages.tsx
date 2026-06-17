import { useMemo, type ReactNode } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'

import { useAppSettings, useCliRunArtifact } from '../../../headless'
import { cliTranscriptToMessages } from '../../../headless/utils/cliRunner'
import type { ToolCallLike, ToolResultTypeLike } from '../../../headless/utils/chatTypes'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import type { UikitFileMeta } from '../files/FileDisplay'
import MessageRow from './MessageRow'

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
  const { theme } = useNativeTheme()
  const { transcript, status } = useCliRunArtifact(runId, undefined)
  const showThinking = useAppSettings().settings.userPreferences.cliShowThinking ?? true
  const streaming =
    status === 'running' || status === 'awaiting-approval' || status === 'paused'
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
      {streaming ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 }}>
          <ActivityIndicator size="small" color={theme.text.secondary} />
          <Text style={{ fontSize: 11, color: theme.text.secondary }}>Working…</Text>
        </View>
      ) : null}
      {renderCliRunArtifact ? renderCliRunArtifact(runId) : null}
    </View>
  )
}
