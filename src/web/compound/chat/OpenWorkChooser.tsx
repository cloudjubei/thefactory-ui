import type { ReactNode } from 'react'

import {
  OPEN_WORK_PICK_HINT,
  OPEN_WORK_RISKY_TAG,
  processOpenWorkView,
  type ProcessOpenWork,
  type ProcessOpenWorkChoice,
} from '../../../headless'

export type OpenWorkChooserProps = {
  /** The story's open work, from the launch preview. */
  openWork: ProcessOpenWork
  /** The way chosen so far; nothing until the person picks one. */
  choice: ProcessOpenWorkChoice | undefined
  busy?: boolean
  onChoose: (choice: ProcessOpenWorkChoice) => void
  /** The host's live card for a process run, opening it on click — shows the open run. */
  renderRun?: (processRunId: string) => ReactNode
}

/**
 * The story already has open work — a run still going, or finished and not
 * merged. Says which run and where it stands (its live card, when the host
 * gives one), offers the ways to proceed as one row of choices — only adding
 * to a run still live — and says what the picked one entails and what could go
 * wrong; the launch waits for a pick, or says it cannot start when no way is
 * open. Native peer:
 * `native/compound/chat/OpenWorkChooser`.
 */
export default function OpenWorkChooser({
  openWork,
  choice,
  busy = false,
  onChoose,
  renderRun,
}: OpenWorkChooserProps) {
  const view = processOpenWorkView(openWork)
  const picked = view.options.find((o) => o.choice === choice)
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-(--status-working-soft-border) bg-(--status-working-soft-bg) px-2.5 py-2">
      <span className="text-[12.5px] font-semibold text-(--text-primary)">{view.headline}</span>
      {renderRun ? renderRun(openWork.runId) : null}
      {view.holds || view.adds ? (
        <span className="text-[11.5px] text-(--text-secondary)">
          {view.holds ? `It holds: ${view.holds}.` : ''}{' '}
          {view.adds ? `This launch adds: ${view.adds}.` : ''}
        </span>
      ) : null}
      <div
        role="radiogroup"
        aria-label="This story already has open work"
        className="flex flex-wrap gap-1.5"
      >
        {view.options.map((option) => {
          const selected = choice === option.choice
          return (
            <button
              key={option.choice}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={busy || !option.available}
              title={option.available ? option.detail : option.reason}
              onClick={() => onChoose(option.choice)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-(--accent-primary) disabled:opacity-50 ${
                selected
                  ? 'border-(--accent-primary) bg-(--accent-primary) font-medium text-white'
                  : 'border-(--border-strong) bg-(--surface-raised) text-(--text-primary) enabled:hover:border-(--accent-primary)'
              }`}
            >
              {option.label}
              {option.risky ? (
                <span
                  className={`rounded-full px-1.5 text-[9.5px] font-semibold uppercase tracking-wide ${
                    selected
                      ? 'bg-white/20 text-white'
                      : 'border border-(--status-stuck-soft-border) bg-(--status-stuck-soft-bg) text-(--status-stuck-soft-fg)'
                  }`}
                >
                  {OPEN_WORK_RISKY_TAG}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
      {view.blocked ? (
        <span className="text-[11.5px] font-medium text-(--status-stuck-soft-fg)">
          {view.blocked}
        </span>
      ) : picked ? (
        <span className="text-[11.5px] leading-snug text-(--text-secondary)">{picked.detail}</span>
      ) : (
        <span className="text-[11px] font-medium text-(--status-working-soft-fg)">
          {OPEN_WORK_PICK_HINT}
        </span>
      )}
      {view.warnings.map((warning) => (
        <span key={warning} className="text-[11px] font-medium text-(--status-working-soft-fg)">
          {warning}
        </span>
      ))}
    </div>
  )
}
