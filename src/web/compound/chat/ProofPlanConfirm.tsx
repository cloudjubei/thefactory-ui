import ReferenceTextarea from '../files/ReferenceTextarea'
import {
  PROOF_PLAN_CONFIRM_DETAIL,
  PROOF_PLAN_CONFIRM_HEADING,
  PROOF_PLAN_EDITED_LABEL,
  PROOF_PLAN_EMPTY_LABEL,
  PROOF_PLAN_EXTEND_NOTE,
  PROOF_PLAN_NOTES_PLACEHOLDER,
  PROOF_PLAN_SAVE_LABEL,
  type LaunchProofPlanRow,
  type ProofKind,
} from '../../../headless'

export type ProofPlanConfirmProps = {
  rows: readonly LaunchProofPlanRow[]
  /** Write the confirmed plans back onto the features. */
  save: boolean
  /** The features join an open run, which reads their own plans: they are always saved. */
  joinsOpenRun?: boolean
  busy?: boolean
  onToggleKind: (featureId: string, kind: ProofKind) => void
  onNotesChange: (featureId: string, notes: string) => void
  onSaveChange: (save: boolean) => void
}

/**
 * The launch's proof plans: each feature's plan as its requestor set it — or
 * the suggested one, marked so — for the person starting the work to confirm
 * or add to, with every kind this host or process cannot prove flagged with
 * why. The confirmed plans ride the launch decision. Native peer:
 * `native/compound/chat/ProofPlanConfirm`.
 */
export default function ProofPlanConfirm({
  rows,
  save,
  joinsOpenRun = false,
  busy = false,
  onToggleKind,
  onNotesChange,
  onSaveChange,
}: ProofPlanConfirmProps) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-(--border-subtle) bg-(--surface-base) px-2.5 py-2">
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
          {PROOF_PLAN_CONFIRM_HEADING}
        </span>
        <span className="text-[11px] text-(--text-secondary)">{PROOF_PLAN_CONFIRM_DETAIL}</span>
      </div>
      {rows.map((row) => (
        <div
          key={row.featureId}
          className="flex flex-col gap-1 border-t border-(--border-subtle) pt-1.5"
        >
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="min-w-0 truncate text-[12.5px] font-medium text-(--text-primary)">
              {row.title}
            </span>
            <span
              className={`text-[10.5px] ${row.source === 'suggested' ? 'text-(--status-review-soft-fg)' : 'text-(--text-muted)'}`}
            >
              {row.sourceLabel}
            </span>
            {row.edited ? (
              <span className="text-[10.5px] text-(--text-muted)">· {PROOF_PLAN_EDITED_LABEL}</span>
            ) : null}
          </div>
          <div
            role="group"
            aria-label={`${PROOF_PLAN_CONFIRM_HEADING}: ${row.title}`}
            className="flex flex-wrap gap-1"
          >
            {row.kinds.map((kind) => (
              <button
                key={kind.kind}
                type="button"
                aria-pressed={kind.checked}
                title={kind.unavailable ? `${kind.meaning} — ${kind.unavailable}` : kind.meaning}
                disabled={busy}
                onClick={() => onToggleKind(row.featureId, kind.kind)}
                className={`rounded-full border px-2 py-0.5 text-[11.5px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-(--accent-primary) disabled:opacity-50 ${
                  kind.checked
                    ? kind.unavailable
                      ? 'border-(--status-review-soft-border) bg-(--status-review-soft-bg) font-medium text-(--status-review-soft-fg)'
                      : 'border-(--accent-primary) bg-(--accent-primary)/10 font-medium text-(--text-primary)'
                    : `border-(--border-default) bg-(--surface-raised) text-(--text-secondary) enabled:hover:border-(--accent-primary) ${kind.unavailable ? 'line-through decoration-(--text-muted)' : ''}`
                }`}
              >
                {kind.label}
              </button>
            ))}
          </div>
          {row.flagged.map((flag) => (
            <span
              key={flag.kind}
              role="alert"
              className="text-[11px] text-(--status-review-soft-fg)"
            >
              {flag.label} cannot be proven here: {flag.reason}
            </span>
          ))}
          {row.uiWarning ? (
            <span role="alert" className="text-[11px] text-(--status-review-soft-fg)">
              {row.uiWarning}
            </span>
          ) : null}
          {row.empty ? (
            <span className="text-[11px] text-(--text-muted)">{PROOF_PLAN_EMPTY_LABEL}</span>
          ) : null}
          <ReferenceTextarea
            rows={1}
            value={row.notes}
            disabled={busy}
            onChange={(next) => onNotesChange(row.featureId, next)}
            placeholder={PROOF_PLAN_NOTES_PLACEHOLDER}
            ariaLabel={`What must be shown: ${row.title}`}
            className="px-2 py-1 text-[12px] disabled:opacity-60"
          />
        </div>
      ))}
      {joinsOpenRun ? (
        <span className="text-[10.5px] text-(--text-muted)">{PROOF_PLAN_EXTEND_NOTE}</span>
      ) : (
        <label className="flex items-center gap-2 text-[11.5px] text-(--text-secondary)">
          <input
            type="checkbox"
            checked={save}
            disabled={busy}
            onChange={(e) => onSaveChange(e.target.checked)}
          />
          {PROOF_PLAN_SAVE_LABEL}
        </label>
      )}
    </div>
  )
}
