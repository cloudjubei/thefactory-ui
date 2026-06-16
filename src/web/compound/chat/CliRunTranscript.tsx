import { useState } from 'react'

import type { CliRunTranscriptEntry } from '../../../headless/api'
import { cliTranscriptEntryView } from '../../../headless/utils/cliRunner'

export type CliRunTranscriptProps = {
  /** The run's full transcript (assistant text, tool calls/results, protocol events). */
  entries: CliRunTranscriptEntry[]
}

const KIND_BADGE: Record<CliRunTranscriptEntry['kind'], string> = {
  assistant: 'text-(--color-blue-700) dark:text-(--color-blue-300)',
  'tool-call': 'text-(--color-orange-700) dark:text-(--color-orange-300)',
  'tool-result': 'text-(--color-green-700) dark:text-(--color-green-300)',
  system: 'text-(--text-secondary)',
  result: 'text-(--text-secondary)',
  other: 'text-(--text-secondary)',
}

function TranscriptRow({ entry }: { entry: CliRunTranscriptEntry }) {
  const { label, detail, raw } = cliTranscriptEntryView(entry)
  const [showRaw, setShowRaw] = useState(false)
  const hasRaw = raw !== detail
  return (
    <details className="rounded border border-(--border-subtle) bg-(--surface-base)">
      <summary className="flex items-center gap-2 px-2 py-1 cursor-pointer text-[12px]">
        <span className={`font-medium ${KIND_BADGE[entry.kind] ?? KIND_BADGE.other}`}>{label}</span>
      </summary>
      <div className="px-2 pb-2 flex flex-col gap-2">
        <pre className="text-[11px] whitespace-pre-wrap break-words text-(--text-primary) max-h-80 overflow-auto">
          {detail}
        </pre>
        {hasRaw ? (
          <div>
            <button
              type="button"
              className="text-[11px] underline text-(--text-secondary)"
              onClick={() => setShowRaw((v) => !v)}
            >
              {showRaw ? 'Hide raw payload' : 'Show raw payload'}
            </button>
            {showRaw ? (
              <pre className="mt-1 text-[11px] whitespace-pre-wrap break-words text-(--text-secondary) max-h-80 overflow-auto">
                {raw}
              </pre>
            ) : null}
          </div>
        ) : null}
      </div>
    </details>
  )
}

/**
 * A collapsible inspector for a CLI run's step-by-step transcript: every
 * assistant message, tool call, tool result, and protocol event the agent
 * produced between the prompt and the final diff. Each row expands to the
 * readable content with a "show raw payload" toggle for thorough inspection.
 */
export default function CliRunTranscript({ entries }: CliRunTranscriptProps) {
  const [expanded, setExpanded] = useState(false)
  if (entries.length === 0) return null
  return (
    <div className="border-t border-(--border-subtle) px-3 py-2 flex flex-col gap-2">
      <button
        type="button"
        className="flex items-center gap-2 text-left text-[12px] font-medium text-(--text-secondary) hover:text-(--text-primary)"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        {expanded ? '▾' : '▸'} Run steps ({entries.length})
      </button>
      {expanded ? (
        <div className="flex flex-col gap-1.5">
          {entries.map((entry, i) => (
            <TranscriptRow key={i} entry={entry} />
          ))}
        </div>
      ) : null}
    </div>
  )
}
