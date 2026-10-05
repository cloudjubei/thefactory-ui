import ReferenceTextarea from '../files/ReferenceTextarea'
import {
  PROOF_PLAN_AUTOMATIC_LABEL,
  PROOF_PLAN_EDITOR_HINT,
  PROOF_PLAN_EDITOR_LABEL,
  PROOF_PLAN_INHERITS_PREFIX,
  PROOF_PLAN_NOTES_PLACEHOLDER,
  proofKindOptions,
  proofPlanSummaryLine,
  type ProofKind,
  type ProofPlan,
  type ProofPlanDraft,
} from '../../../headless'

export type ProofPlanEditorProps = {
  draft: ProofPlanDraft
  onToggleKind: (kind: ProofKind) => void
  onNotesChange: (notes: string) => void
  /** The story's plan, which a feature with none of its own inherits. */
  inherited?: ProofPlan
  disabled?: boolean
}

/**
 * The feature editor's proof plan: the kinds of proof that would show the
 * change is right, and what specifically must be shown. Whoever asks for the
 * feature decides it; the person starting the work confirms it. Native peer:
 * `native/compound/stories/ProofPlanEditor`.
 */
export default function ProofPlanEditor({
  draft,
  onToggleKind,
  onNotesChange,
  inherited,
  disabled = false,
}: ProofPlanEditorProps) {
  const empty = draft.kinds.length === 0
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-(--text-secondary)">{PROOF_PLAN_EDITOR_LABEL}</span>
      <div role="group" aria-label={PROOF_PLAN_EDITOR_LABEL} className="flex flex-wrap gap-1.5">
        {proofKindOptions().map((option) => {
          const picked = draft.kinds.includes(option.kind)
          return (
            <button
              key={option.kind}
              type="button"
              aria-pressed={picked}
              title={option.meaning}
              disabled={disabled}
              onClick={() => onToggleKind(option.kind)}
              className={`rounded-full border px-2.5 py-1 text-[12px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-(--accent-primary) disabled:opacity-50 ${
                picked
                  ? 'border-(--accent-primary) bg-(--accent-primary)/10 font-medium text-(--text-primary)'
                  : 'border-(--border-default) bg-(--surface-raised) text-(--text-secondary) enabled:hover:border-(--accent-primary)'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
      <ReferenceTextarea
        rows={2}
        value={draft.notes}
        onChange={onNotesChange}
        disabled={disabled}
        placeholder={PROOF_PLAN_NOTES_PLACEHOLDER}
        ariaLabel={`${PROOF_PLAN_EDITOR_LABEL} notes`}
        className="resize-y disabled:opacity-60"
      />
      <span className="text-xs text-(--text-muted)">
        {empty
          ? inherited
            ? `${PROOF_PLAN_INHERITS_PREFIX} ${proofPlanSummaryLine(inherited)}`
            : PROOF_PLAN_AUTOMATIC_LABEL
          : PROOF_PLAN_EDITOR_HINT}
      </span>
    </div>
  )
}
