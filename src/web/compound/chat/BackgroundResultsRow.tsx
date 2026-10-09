import { useState } from 'react'
import type { ChatBackgroundJobResult } from 'thefactory-tools/types'
import Code from '../Code'
import StatusIcon from './ToolCall/StatusIcon'
import {
  backgroundJobAnchorId,
  describeBackgroundResult,
} from '../../../headless/utils/backgroundJobs'
import {
  BACKGROUND_RESULT_JUMP_LABEL,
  BACKGROUND_RESULTS_TITLE,
} from '../../../headless/utils/backgroundJobsConstants'

export type BackgroundResultsRowProps = {
  results: ChatBackgroundJobResult[]
  /** The message the agent was given, results in full. */
  content: string
  timestamp?: string
}

/**
 * Results of calls an agent made earlier that finished in the background — one
 * line per call with how it ended, each jumping back to where the call was made.
 */
export default function BackgroundResultsRow({
  results,
  content,
  timestamp,
}: BackgroundResultsRowProps) {
  const [open, setOpen] = useState(false)
  const jump = (jobId: string): void => {
    document
      .getElementById(backgroundJobAnchorId(jobId))
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  return (
    <div className="w-full rounded-md border border-(--border-subtle) bg-(--surface-overlay) text-sm text-(--text-primary)">
      <div className="flex items-baseline gap-2 px-3 pt-2 text-xs text-(--text-secondary)">
        <span className="font-semibold">{BACKGROUND_RESULTS_TITLE}</span>
        {timestamp ? <span>· {timestamp}</span> : null}
      </div>
      <ul className="flex flex-col gap-1 px-3 py-2">
        {results.map((result) => (
          <li key={result.jobId} className="flex items-center gap-2 min-w-0">
            <StatusIcon resultType={result.status === 'succeeded' ? 'success' : 'errored'} />
            <span className="font-semibold shrink-0">{result.toolName}</span>
            <span className="truncate text-(--text-secondary)">
              {describeBackgroundResult(result)}
            </span>
            <button
              type="button"
              className="ml-auto shrink-0 text-xs text-(--text-secondary) hover:text-(--text-primary) hover:underline"
              onClick={() => jump(result.jobId)}
            >
              {BACKGROUND_RESULT_JUMP_LABEL} ↑
            </button>
          </li>
        ))}
      </ul>
      <div className="border-t border-(--border-subtle)">
        <button
          type="button"
          className="w-full flex items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-(--surface-raised)"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span className="font-medium">What the agent was given</span>
          <span className="text-(--text-secondary)">{open ? '−' : '+'}</span>
        </button>
        {open ? (
          <div className="border-t border-(--border-subtle) p-2 max-h-72 overflow-auto bg-(--surface-raised)">
            <Code language="text" code={content} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
