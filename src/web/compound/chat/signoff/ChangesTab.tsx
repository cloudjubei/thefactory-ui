import { useState } from 'react'

import type { CliRunReview } from '../../../../headless/api'
import { Button } from '../../../primitives/Button'
import { IconBranch, IconChevron, IconMaximize } from '../../../icons'
import { StructuredUnifiedDiff } from '../../diff'
import GitFileChangesPills from '../../git/common/GitFileChangesPills'
import GitFileStatusIcon from '../../git/common/GitFileStatusIcon'
import { PathDisplay } from '../../PathDisplay'
import { RefChip } from '../../chips'

/** One changed file, whichever path (review branch or captured artifact) it came from. */
export type ChangeFile = {
  path: string
  /** `A` / `M` / `D`, as the git views expect. */
  status: 'A' | 'M' | 'D'
  patch?: string
  /** Why there is no patch to show, when there is none. */
  note?: string
  /** A warning to surface beside the path (a conflict, an unsafe path). */
  warning?: string
}

export type ChangesTabProps = {
  review: CliRunReview | undefined
  files: readonly ChangeFile[]
  loading: boolean
  error: string | undefined
  onRetry: (() => void) | undefined
  /** Opens this branch in the app's Git view, when the host wires it. */
  onOpenGit: (() => void) | undefined
}

function FileRow({ file, defaultOpen }: { file: ChangeFile; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-(--border-subtle) last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 bg-(--surface-overlay) px-2 py-1.5 text-left text-xs hover:bg-(--surface-raised)"
      >
        <IconChevron
          className="w-3.5 h-3.5 text-(--text-muted) transition-transform"
          style={{ transform: open ? 'rotate(90deg)' : undefined }}
        />
        <GitFileStatusIcon status={file.status} isConflicted={file.warning !== undefined} />
        <div className="min-w-0 flex-1">
          <PathDisplay path={file.path} />
        </div>
        {file.warning ? (
          <span
            className="text-[11px] font-medium text-red-700 dark:text-red-400"
            title={file.warning}
          >
            {file.warning}
          </span>
        ) : null}
        <GitFileChangesPills patch={file.patch} />
      </button>
      {open ? (
        <div className="max-h-[270px] overflow-auto bg-(--surface-raised)">
          {file.patch ? (
            <StructuredUnifiedDiff patch={file.patch} />
          ) : (
            <div className="p-3 text-[12px] text-(--text-muted)">
              {file.note ?? 'No textual diff.'}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

/**
 * The change itself, on the shipped code-changes design: the git file-row trio
 * over `StructuredUnifiedDiff`. A standard commit header sits above — branch,
 * base, head, each a ref chip — with a way into the app's Git view.
 */
export default function ChangesTab({
  review,
  files,
  loading,
  error,
  onRetry,
  onOpenGit,
}: ChangesTabProps) {
  return (
    <div className="flex flex-col gap-2">
      {review ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <IconBranch className="w-3.5 h-3.5 text-(--text-muted)" />
          <RefChip kind="branch" value={review.branch} />
          <span className="text-(--text-muted)">from</span>
          <RefChip kind="commit" value={review.baseSha} />
          {review.headSha ? (
            <>
              <span className="text-(--text-muted)">to</span>
              <RefChip kind="commit" value={review.headSha} />
            </>
          ) : null}
          <span className="flex-1" />
          {onOpenGit ? (
            <Button
              variant="secondary"
              size="icon"
              aria-label="Open in Git"
              title="Open this branch in the Git view"
              onClick={onOpenGit}
            >
              <IconMaximize className="w-4 h-4" />
            </Button>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="text-[12px] text-red-700 dark:text-red-400">
          {error}{' '}
          {onRetry ? (
            <button type="button" className="underline" onClick={onRetry}>
              Retry
            </button>
          ) : null}
        </div>
      ) : null}
      {loading ? <div className="text-[12px] text-(--text-secondary)">Loading diff…</div> : null}

      {files.length > 0 ? (
        <div className="overflow-hidden rounded-md border border-(--border-subtle) bg-(--surface-base)">
          {files.map((file, i) => (
            <FileRow key={file.path} file={file} defaultOpen={i === 0 && files.length <= 3} />
          ))}
        </div>
      ) : !loading && !error ? (
        <div className="text-[12px] text-(--text-muted)">No files changed.</div>
      ) : null}
    </div>
  )
}
