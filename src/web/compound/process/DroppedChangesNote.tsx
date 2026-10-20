import {
  PROCESS_DROPPED_CHANGE_LABEL,
  processDroppedChangeRows,
  type ProcessRun,
} from '../../../headless'
import CommitChip from '../chips/CommitChip'

export type DroppedChangesNoteProps = { run: ProcessRun }

/**
 * The changes an earlier merge into a run's work branch dropped and the person
 * accepted as dropped on purpose — each file with its merge and why — beside
 * its pipeline, oldest first.
 */
export default function DroppedChangesNote({ run }: DroppedChangesNoteProps) {
  const rows = processDroppedChangeRows(run)
  if (rows.length === 0) return null
  return (
    <div className="mx-3 mt-3 flex flex-col gap-1 rounded-md border border-(--border-subtle) bg-(--surface-base) px-2.5 py-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
        {PROCESS_DROPPED_CHANGE_LABEL}
      </span>
      {rows.map((row) => (
        <div key={row.key} className="flex min-w-0 items-start gap-2 text-[12px]">
          <CommitChip projectId={run.projectId} sha={row.mergeSha} />
          <span className="min-w-0 flex-1 text-(--text-secondary)">{row.text}</span>
        </div>
      ))}
    </div>
  )
}
