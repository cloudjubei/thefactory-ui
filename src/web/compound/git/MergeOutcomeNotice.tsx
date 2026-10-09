import type { ReactNode } from 'react'
import type { GitMergeOutcomeLine } from '../../../headless'
import { IconClose } from '../../icons'

const TONE_CLASS: Record<GitMergeOutcomeLine['tone'], string> = {
  success: 'bg-(--status-done-soft-bg) text-(--status-done-soft-fg)',
  info: 'bg-(--status-review-soft-bg) text-(--status-review-soft-fg)',
  warning: 'bg-(--status-working-soft-bg) text-(--text-primary)',
  error: 'bg-(--status-stuck-soft-bg) text-(--status-stuck-soft-fg)',
}

export type MergeOutcomeNoticeProps = {
  line: GitMergeOutcomeLine
  /** Renders the commit the branch now points at as its chip. */
  renderCommitRef?: (sha: string) => ReactNode
  onDismiss: () => void
}

/** One line saying what the last merge did, with the merge commit's chip and how its result's checks went. */
export default function MergeOutcomeNotice({
  line,
  renderCommitRef,
  onDismiss,
}: MergeOutcomeNoticeProps) {
  return (
    <div
      role="status"
      className={`mx-4 mt-3 flex items-center gap-2 rounded px-3 py-2 text-sm shrink-0 ${TONE_CLASS[line.tone]}`}
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span>{line.text}</span>
        {line.checksNote ? <span className="text-xs opacity-80">{line.checksNote}</span> : null}
      </span>
      {line.sha && renderCommitRef ? renderCommitRef(line.sha) : null}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
      >
        <IconClose className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
