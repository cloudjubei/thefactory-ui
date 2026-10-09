import {
  PROCESS_WORK_BRANCH_CHANGES_LABEL,
  processWorkBranchChangeRows,
  type ProcessRun,
} from '../../../headless'
import CommitChip from '../chips/CommitChip'

export type WorkBranchChangesNoteProps = { run: ProcessRun }

/**
 * The changes made to a run's work branch from outside it — each a person
 * approved on a chat's git card — beside its pipeline, newest first.
 */
export default function WorkBranchChangesNote({ run }: WorkBranchChangesNoteProps) {
  const rows = processWorkBranchChangeRows(run)
  if (rows.length === 0) return null
  return (
    <div className="mx-3 mt-3 flex flex-col gap-1 rounded-md border border-(--border-subtle) bg-(--surface-base) px-2.5 py-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
        {PROCESS_WORK_BRANCH_CHANGES_LABEL}
      </span>
      {rows.map((row) => (
        <div key={row.id} className="flex min-w-0 items-center gap-2 text-[12px]">
          <CommitChip projectId={run.projectId} sha={row.sha} />
          <span className="min-w-0 flex-1 truncate text-(--text-secondary)" title={row.summary}>
            {row.summary}
          </span>
        </div>
      ))}
    </div>
  )
}
