import {
  PROCESS_WAIT_FOR_LAUNCH_COPY as COPY,
  addProcessWaitForDraft,
  processWaitForDraftRows,
  removeProcessWaitForDraft,
  updateProcessWaitForDraft,
  type ProcessWaitForDrafts,
} from '../../../headless'
import { Input } from '../../primitives/Input'
import { NativeSelect } from '../../primitives/NativeSelect'

export type LaunchWaitFieldsProps = {
  drafts: ProcessWaitForDrafts
  onChange: (next: ProcessWaitForDrafts) => void
  /** Why the launch refuses the wait — the preview's reason, else the card's own reading. */
  problem?: string
  /** The preview is reading what was typed. */
  checking?: boolean
  /** Where the preview put the wait in the plan. */
  planLine?: string
  /** The projects whose base an entry may name; without them every entry is the run's own. */
  projects?: readonly { id: string; title: string }[]
  busy?: boolean
}

/**
 * A launch's "Wait for other work before proof": folded to one dashed pill
 * until used, then a row per entry — its label, and a branch, commit or pull
 * request link read by its shape, with the project whose base must hold it —
 * what the launch would refuse it for, and where the plan waits.
 */
export default function LaunchWaitFields({
  drafts,
  onChange,
  problem,
  checking = false,
  planLine,
  projects,
  busy = false,
}: LaunchWaitFieldsProps) {
  if (drafts.rows.length === 0) {
    return (
      <button
        type="button"
        onClick={() => onChange(addProcessWaitForDraft(drafts))}
        disabled={busy}
        className="inline-flex w-fit items-center gap-1.5 rounded-full border border-dashed border-(--border-strong) px-2.5 py-1 text-[11.5px] text-(--text-muted) hover:border-(--accent-primary) hover:text-(--text-primary)"
      >
        <span aria-hidden className="text-[13px] leading-none">
          +
        </span>
        {COPY.add}
      </button>
    )
  }
  const rows = processWaitForDraftRows(drafts)
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
        {COPY.heading}
      </span>
      <span className="text-[11.5px] text-(--text-secondary)">{COPY.hint}</span>
      {rows.map((row) => (
        <div key={row.key} className="flex flex-wrap items-center gap-1.5">
          <Input
            size="sm"
            aria-label={COPY.label}
            className="w-[110px] shrink-0"
            value={row.label}
            disabled={busy}
            placeholder={COPY.labelPlaceholder}
            onChange={(e) =>
              onChange(updateProcessWaitForDraft(drafts, row.key, { label: e.target.value }))
            }
          />
          <div className="flex min-w-[180px] flex-[1_1_220px] items-center gap-1.5">
            <Input
              size="sm"
              aria-label={COPY.target}
              className="min-w-0 flex-1"
              value={row.target}
              disabled={busy}
              placeholder={COPY.targetPlaceholder}
              onChange={(e) =>
                onChange(updateProcessWaitForDraft(drafts, row.key, { target: e.target.value }))
              }
            />
            {row.kindLabel ? (
              <span className="shrink-0 rounded-full border border-(--border-subtle) bg-(--surface-overlay) px-1.5 py-px text-[10px] text-(--text-muted)">
                {row.kindLabel}
              </span>
            ) : null}
          </div>
          {projects && projects.length > 0 ? (
            <NativeSelect
              size="sm"
              aria-label={COPY.project}
              className="w-auto max-w-[160px]"
              value={row.projectId ?? ''}
              disabled={busy}
              onChange={(e) =>
                onChange(
                  updateProcessWaitForDraft(drafts, row.key, {
                    projectId: e.target.value || undefined,
                  }),
                )
              }
            >
              <option value="">{COPY.ownProject}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </NativeSelect>
          ) : null}
          <button
            type="button"
            aria-label={COPY.remove}
            title={COPY.remove}
            disabled={busy}
            onClick={() => onChange(removeProcessWaitForDraft(drafts, row.key))}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[14px] text-(--text-muted) hover:bg-(--surface-raised) hover:text-(--text-primary)"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange(addProcessWaitForDraft(drafts))}
        disabled={busy}
        className="w-fit text-[11.5px] font-medium text-(--accent-primary) hover:underline"
      >
        + {COPY.addAnother}
      </button>
      {problem ? (
        <div
          role="alert"
          className="rounded-md px-2.5 py-1.5 text-[12px]"
          style={{
            background: 'var(--status-stuck-soft-bg)',
            border: '1px solid var(--status-stuck-soft-border)',
            color: 'var(--status-stuck-soft-fg)',
          }}
        >
          {problem}
        </div>
      ) : checking ? (
        <span className="text-[11.5px] text-(--text-muted)">{COPY.checking}</span>
      ) : planLine ? (
        <span className="text-[11.5px] text-(--status-queued-soft-fg)">{planLine}</span>
      ) : null}
    </div>
  )
}
