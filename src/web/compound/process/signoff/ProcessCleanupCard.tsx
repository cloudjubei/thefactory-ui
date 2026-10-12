import {
  processCleanupEditable,
  processCleanupHeadline,
  processCleanupRows,
  useProcessCleanup,
} from '../../../../headless'
import { PROCESS_CLEANUP_COPY } from '../../../../headless/utils/processCleanupViewConstants'
import { Alert, Switch } from '../../..'
import { CHIP_PILL_NEUTRAL } from '../../chips/pillStyles'

export type ProcessCleanupCardProps = {
  /** The run whose cleanup list this is — any run at its sign-off, top-level or nested. */
  runId: string
}

/**
 * What a run removes once its sign-off is approved: each item with why, ticked to
 * go, untickable to keep, and a switch to clean up nothing — and, once the
 * cleanup step ran, what it removed. Hidden while there is nothing to show.
 */
export default function ProcessCleanupCard({ runId }: ProcessCleanupCardProps) {
  const { list, loadError, actionError, busy, setItemSelected, setOff } = useProcessCleanup(runId)
  if (loadError) return <Alert variant="error">{PROCESS_CLEANUP_COPY.loadError}</Alert>
  if (!list || (list.items.length === 0 && !list.report)) return null
  const editable = processCleanupEditable(list)
  const rows = processCleanupRows(list)

  return (
    <section
      aria-label={PROCESS_CLEANUP_COPY.title}
      className="flex flex-col gap-3 rounded-xl border border-(--border-subtle) bg-(--surface-raised) px-5 py-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="text-[14px] font-semibold text-(--text-primary)">
            {PROCESS_CLEANUP_COPY.title}
          </div>
          <div className="text-[12.5px] text-(--text-secondary)">
            {processCleanupHeadline(list)}
          </div>
          {editable ? (
            <div className="text-[12px] text-(--text-tertiary)">{PROCESS_CLEANUP_COPY.hint}</div>
          ) : null}
        </div>
        {editable ? (
          <Switch
            checked={!list.off}
            onCheckedChange={(on) => void setOff(!on)}
            label={PROCESS_CLEANUP_COPY.switchLabel}
            disabled={busy}
          />
        ) : null}
      </div>
      {actionError ? <Alert variant="error">{actionError}</Alert> : null}
      <ul className="flex flex-col divide-y divide-(--border-subtle) rounded-lg border border-(--border-subtle)">
        {rows.map((row) => (
          <li key={row.id} className="flex items-start gap-3 p-2.5">
            {editable ? (
              <Switch
                checked={row.selected && !list.off}
                onCheckedChange={(selected) => void setItemSelected(row.id, selected)}
                ariaLabel={PROCESS_CLEANUP_COPY.keepLabel(row.label)}
                disabled={busy || list.off}
              />
            ) : null}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate font-mono text-[12.5px] text-(--text-primary)">
                  {row.label}
                </span>
                <span className={CHIP_PILL_NEUTRAL}>{row.kindLabel}</span>
                {row.outcome ? (
                  <span className={CHIP_PILL_NEUTRAL}>{row.outcome.label}</span>
                ) : null}
              </div>
              {row.reason ? (
                <div className="text-[12px] text-(--text-secondary)">{row.reason}</div>
              ) : null}
              {row.outcome?.detail ? (
                <div className="text-[12px] text-(--status-stuck-soft-fg)">
                  {row.outcome.detail}
                </div>
              ) : null}
              {row.byLabel ? (
                <div className="text-[11.5px] text-(--text-tertiary)">{row.byLabel}</div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
