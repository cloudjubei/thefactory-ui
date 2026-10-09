import { useState } from 'react'
import ReferenceTextarea from '../files/ReferenceTextarea'
import DependencyBullet from '../stories/DependencyBullet'
import ChainChip from '../process/ChainChip'
import {
  LAUNCH_FEATURES_HEADING,
  PROOF_PLAN_EDITED_LABEL,
  PROOF_PLAN_EMPTY_LABEL,
  PROOF_PLAN_EMPTY_SHORT,
  PROOF_PLAN_EXTEND_NOTE,
  PROOF_PLAN_NOTES_PLACEHOLDER,
  PROOF_PLAN_SAVE_LABEL,
  type LaunchFeatureRow,
  type ProofKind,
  type ProposalChip,
} from '../../../headless'

export type LaunchFeatureListProps = {
  /** The story the features belong to — names each one by its bullet. */
  storyId?: string
  rows: readonly LaunchFeatureRow[]
  /** Story-level steps run once after the features — the sign-off, chiefly. */
  tail: readonly ProposalChip[]
  /** Steps where a model runs, across the whole plan. */
  agentStepCount?: number
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
 * The launch card's features, each once: its bullet and title, how it is proven
 * as a short summary, and what cannot pass as planned — with its proof opened
 * for editing on demand and its pipeline steps shown on demand, so a story of a
 * dozen features still fits. Native peer: `native/compound/chat/LaunchFeatureList`.
 */
export default function LaunchFeatureList({
  storyId,
  rows,
  tail,
  agentStepCount,
  save,
  joinsOpenRun = false,
  busy = false,
  onToggleKind,
  onNotesChange,
  onSaveChange,
}: LaunchFeatureListProps) {
  const [editing, setEditing] = useState<ReadonlySet<string>>(new Set())
  const [showSteps, setShowSteps] = useState(false)
  const hasSteps = rows.some((r) => r.chain.length > 0) || tail.length > 0
  const anyEdited = rows.some((r) => r.proof?.edited)
  const toggleEditing = (featureId: string) =>
    setEditing((prev) => {
      const next = new Set(prev)
      if (next.has(featureId)) next.delete(featureId)
      else next.add(featureId)
      return next
    })

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
          {LAUNCH_FEATURES_HEADING}
        </span>
        <span className="text-[11px] text-(--text-muted)">
          {rows.length} feature{rows.length === 1 ? '' : 's'}
          {agentStepCount !== undefined
            ? ` · ${agentStepCount} agent step${agentStepCount === 1 ? '' : 's'}`
            : ''}
        </span>
        {hasSteps ? (
          <button
            type="button"
            aria-expanded={showSteps}
            onClick={() => setShowSteps((v) => !v)}
            className="ml-auto text-[11.5px] text-(--accent-primary) hover:underline"
          >
            {showSteps ? 'Hide steps' : 'Show steps'}
          </button>
        ) : null}
      </div>
      <div className="flex flex-col overflow-hidden rounded-md border border-(--border-subtle) bg-(--surface-base)">
        {rows.map((row, i) => {
          const proof = row.proof
          const open = proof !== undefined && editing.has(row.featureId)
          return (
            <div
              key={row.featureId}
              className={`flex flex-col gap-1.5 px-2.5 py-1.5 ${i > 0 ? 'border-t border-(--border-subtle)' : ''}`}
            >
              <div className="flex min-h-[26px] items-center gap-2">
                {storyId ? (
                  <DependencyBullet dependency={`${storyId}.${row.featureId}`} interactive />
                ) : null}
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-(--text-primary)">
                  {row.title}
                </span>
                {proof && !open ? (
                  <span className="flex shrink-0 flex-wrap justify-end gap-1">
                    {row.proofLabels.length > 0 ? (
                      row.proofLabels.map((label) => (
                        <span
                          key={label}
                          className="rounded-full bg-(--accent-primary)/10 px-2 py-px text-[11px] text-(--text-primary)"
                        >
                          {label}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-(--text-muted)">
                        {PROOF_PLAN_EMPTY_SHORT}
                      </span>
                    )}
                  </span>
                ) : null}
                {proof ? (
                  <>
                    <span
                      className={`shrink-0 text-[10.5px] ${proof.source === 'suggested' && !proof.edited ? 'text-(--status-review-soft-fg)' : 'text-(--text-muted)'}`}
                    >
                      {proof.edited ? PROOF_PLAN_EDITED_LABEL : proof.sourceLabel}
                    </span>
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-label={`${open ? 'Done editing' : 'Edit'} how “${row.title}” is proven`}
                      disabled={busy}
                      onClick={() => toggleEditing(row.featureId)}
                      className="shrink-0 rounded-md border border-(--border-default) bg-(--surface-raised) px-2 py-0.5 text-[11.5px] text-(--text-primary) enabled:hover:border-(--accent-primary) disabled:opacity-50"
                    >
                      {open ? 'Done' : 'Edit'}
                    </button>
                  </>
                ) : null}
              </div>

              {proof?.flagged.map((flag) => (
                <span
                  key={flag.kind}
                  role="alert"
                  className="text-[11px] text-(--status-review-soft-fg)"
                >
                  {flag.label} cannot be proven here: {flag.reason}
                </span>
              ))}
              {proof?.uiWarning ? (
                <span
                  role="alert"
                  className="rounded bg-(--status-review-soft-bg) px-2 py-1 text-[11px] text-(--status-review-soft-fg)"
                >
                  {proof.uiWarning}
                </span>
              ) : null}

              {open && proof ? (
                <div className="flex flex-col gap-1.5 pb-1">
                  <div
                    role="group"
                    aria-label={`How “${row.title}” is proven`}
                    className="flex flex-wrap gap-1"
                  >
                    {proof.kinds.map((kind) => (
                      <button
                        key={kind.kind}
                        type="button"
                        aria-pressed={kind.checked}
                        title={
                          kind.unavailable ? `${kind.meaning} — ${kind.unavailable}` : kind.meaning
                        }
                        disabled={busy}
                        onClick={() => onToggleKind(row.featureId, kind.kind)}
                        className={`rounded-full border px-2 py-0.5 text-[11.5px] focus-visible:outline-2 focus-visible:outline-(--accent-primary) disabled:opacity-50 ${
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
                  {proof.empty ? (
                    <span className="text-[11px] text-(--text-muted)">
                      {PROOF_PLAN_EMPTY_LABEL}
                    </span>
                  ) : null}
                  <ReferenceTextarea
                    rows={1}
                    value={proof.notes}
                    disabled={busy}
                    onChange={(next) => onNotesChange(row.featureId, next)}
                    placeholder={PROOF_PLAN_NOTES_PLACEHOLDER}
                    ariaLabel={`What must be shown: ${row.title}`}
                    className="px-2 py-1 text-[12px] disabled:opacity-60"
                  />
                </div>
              ) : null}

              {showSteps && row.chain.length > 0 ? (
                <div className="flex flex-wrap items-center gap-x-1 gap-y-1 pl-1">
                  {row.chain.map((chip, j) => (
                    <span key={chip.id} className="flex items-center gap-1">
                      {j > 0 ? <span className="text-(--border-strong)">›</span> : null}
                      <ChainChip chip={chip} />
                    </span>
                  ))}
                  {row.maxIterations && row.maxIterations > 1 ? (
                    <span className="ml-1 text-[10px] text-(--text-muted)">
                      · up to {row.maxIterations} attempts
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          )
        })}
        {showSteps && tail.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1 border-t border-(--border-subtle) bg-(--surface-muted) px-2.5 py-1.5">
            <span className="mr-1 text-[11px] text-(--text-secondary)">Then the story:</span>
            {tail.map((chip, j) => (
              <span key={chip.id} className="flex items-center gap-1">
                {j > 0 ? <span className="text-(--border-strong)">›</span> : null}
                <ChainChip chip={chip} />
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {joinsOpenRun && rows.some((r) => r.proof) ? (
        <span className="text-[10.5px] text-(--text-muted)">{PROOF_PLAN_EXTEND_NOTE}</span>
      ) : anyEdited ? (
        <label className="flex items-center gap-2 text-[11.5px] text-(--text-secondary)">
          <input
            type="checkbox"
            checked={save}
            disabled={busy}
            onChange={(e) => onSaveChange(e.target.checked)}
          />
          {PROOF_PLAN_SAVE_LABEL}
        </label>
      ) : null}
    </div>
  )
}
