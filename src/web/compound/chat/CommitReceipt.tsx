import { useState } from 'react'

import {
  COMMIT_RECEIPT_COPY,
  useChatActions,
  useRunPassedProof,
  type CheckMethodRow,
  type CommitReceiptView,
} from '../../../headless'
import { IconCommit } from '../../icons'
import { CheckChip, CommitChip } from '../chips'
import { CommitChangeDetails } from './CommitChangeDetails'

export type CommitReceiptProps = {
  view: CommitReceiptView
  /** The proof the turn already has — the methods that passed. */
  proof?: readonly CheckMethodRow[]
  /** The project the commit is in; with it the commit opens in the Git view. */
  projectId?: string
  /** Starts with the change open — for a record that shows it. */
  defaultOpen?: boolean
}

/**
 * The one line a commit the person approved leaves in the chat, in place of
 * its tool row: what was committed and where, how many files, the proof the
 * turn already has — and "View the change" opening the files and the message
 * in place. Committing was the decision; nothing here asks for another.
 */
export function CommitReceipt({
  view,
  proof = [],
  projectId,
  defaultOpen = false,
}: CommitReceiptProps) {
  const [open, setOpen] = useState(defaultOpen)
  const canOpen = view.files.length > 0 || view.message !== undefined
  return (
    <div className="flex flex-col rounded-md border border-(--border-subtle) bg-(--surface-overlay)">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 px-3 py-2 text-[13px] text-(--text-primary)">
        <IconCommit className="h-4 w-4 shrink-0" />
        <span className="flex items-center gap-1.5">
          {COMMIT_RECEIPT_COPY.committed}
          {projectId && view.fullSha ? (
            <CommitChip projectId={projectId} sha={view.fullSha} />
          ) : (
            <b className="font-mono font-semibold">{view.sha}</b>
          )}
          {view.branch ? `${COMMIT_RECEIPT_COPY.to} ${view.branch}` : null}
        </span>
        {view.filesLabel ? (
          <span className="text-(--text-secondary)">{view.filesLabel}</span>
        ) : null}
        {proof.map((row) => (
          <CheckChip key={row.id} row={row} inert />
        ))}
        {canOpen ? (
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
      {open ? <CommitChangeDetails files={view.files} message={view.message} /> : null}
    </div>
  )
}

/** The receipt with the proof the turn that made the commit already has, read off its run. */
export function CommitReceiptConnected({
  view,
  runId,
}: {
  view: CommitReceiptView
  runId: string | undefined
}) {
  const projectId = useChatActions()?.projectId
  const proof = useRunPassedProof(runId, projectId)
  return <CommitReceipt view={view} proof={proof} {...(projectId ? { projectId } : {})} />
}
