import { useState } from 'react'

import { COMMIT_RECEIPT_COPY, type CommitReceiptFile } from '../../../headless'
import { IconCheck } from '../../icons'
import { CommitChangeDetails } from './CommitChangeDetails'

export type AlreadyOnBaseLineProps = {
  /** "Already on dev as 0956f8c — nothing left to review". */
  text: string
  /** What "View the change" opens to; without it the line only says so. */
  change?: { files: readonly CommitReceiptFile[]; message?: string }
  /** Starts with the change open — for a record that shows it. */
  defaultOpen?: boolean
}

/**
 * The one neutral line a turn leaves when its base already holds its change:
 * nothing failed and nothing is left to decide — no verdict, no checks, no
 * Apply or Discard.
 */
export function AlreadyOnBaseLine({ text, change, defaultOpen = false }: AlreadyOnBaseLineProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="mt-2 flex max-w-2xl flex-col rounded-md border border-(--border-subtle) bg-(--surface-muted)">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 px-3 py-2 text-[13px] text-(--text-secondary)">
        <IconCheck className="h-4 w-4 shrink-0" />
        <span>{text}</span>
        {change ? (
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="ml-auto shrink-0 text-[13px] text-(--accent-primary) hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)"
          >
            {open ? COMMIT_RECEIPT_COPY.hide : COMMIT_RECEIPT_COPY.view}
          </button>
        ) : null}
      </div>
      {open && change ? (
        <CommitChangeDetails files={change.files} message={change.message} />
      ) : null}
    </div>
  )
}
