import { useState, type ReactNode } from 'react'
import { GIT_MERGE_TEXT, mergeBannerTitle } from '../../../headless'
import type { GitMergeInProgress } from '../../../headless/api'
import { Button } from '../../primitives/Button'
import { PathDisplay } from '../PathDisplay'

export type MergeInProgressBannerProps = {
  merging: GitMergeInProgress
  current: string | undefined
  /** Opens a conflicted file to resolve it. */
  onResolveFile: (path: string) => void
  /** Marks a conflicted file resolved — stages it. */
  onMarkResolved: (path: string) => Promise<void>
  /** Opens the commit composer, prefilled with the merge message. */
  onCommit: () => void
  onAbort: () => Promise<void>
  /** Shown under the title — e.g. why the last action failed. */
  notice?: ReactNode
}

/**
 * The top of the Git view while a merge is in progress: what is being merged,
 * the files still in conflict — each openable to resolve, or marked resolved —
 * and the two ways out: commit the merge, or abort it after an in-page confirm.
 */
export default function MergeInProgressBanner({
  merging,
  current,
  onResolveFile,
  onMarkResolved,
  onCommit,
  onAbort,
  notice,
}: MergeInProgressBannerProps) {
  const [confirmingAbort, setConfirmingAbort] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const conflicted = merging.conflictedFiles

  const run = async (key: string, op: () => Promise<void>) => {
    setBusy(key)
    try {
      await op()
    } finally {
      setBusy(null)
    }
  }

  return (
    <section
      role="status"
      aria-label="Merge in progress"
      className="mx-4 mt-3 flex flex-col gap-2 rounded-lg border border-(--status-working-soft-border) bg-(--status-working-soft-bg) px-3 py-2.5 text-sm shrink-0"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-(--text-primary)">
          {mergeBannerTitle(merging, current)}
        </span>
        <span className="grow" />
        {confirmingAbort ? null : (
          <>
            {conflicted.length === 0 ? (
              <Button size="sm" onClick={onCommit}>
                Commit merge
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" onClick={() => setConfirmingAbort(true)}>
              Abort merge
            </Button>
          </>
        )}
      </div>
      {notice}
      {confirmingAbort ? (
        <div className="flex flex-wrap items-center gap-2 rounded bg-(--surface-raised) px-3 py-2">
          <span className="min-w-0 flex-1 text-xs text-(--text-secondary)">
            {GIT_MERGE_TEXT.abortConfirm}
          </span>
          <Button size="sm" variant="ghost" onClick={() => setConfirmingAbort(false)}>
            Keep merging
          </Button>
          <Button
            size="sm"
            variant="danger"
            loading={busy === 'abort'}
            onClick={() =>
              void run('abort', async () => {
                await onAbort()
                setConfirmingAbort(false)
              })
            }
          >
            Abort merge
          </Button>
        </div>
      ) : null}
      {conflicted.length > 0 ? (
        <ul className="flex flex-col divide-y divide-(--border-subtle) rounded bg-(--surface-raised)">
          {conflicted.map((path) => (
            <li key={path} className="flex items-center gap-2 px-2 py-1.5 text-xs">
              <span className="shrink-0 rounded px-1 text-[9px] font-semibold uppercase bg-(--status-stuck-soft-bg) text-(--status-stuck-soft-fg)">
                Conflict
              </span>
              <span className="min-w-0 flex-1 truncate">
                <PathDisplay path={path} />
              </span>
              <Button size="sm" variant="secondary" onClick={() => onResolveFile(path)}>
                Resolve
              </Button>
              <Button
                size="sm"
                variant="ghost"
                loading={busy === path}
                onClick={() => void run(path, () => onMarkResolved(path))}
              >
                Mark resolved
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
