import {
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
}

/**
 * The story already has open work — a run still going, or finished and not
 * merged. Says which run, where it stands and what could go wrong, then offers
 * the three ways to proceed, each with what it entails; the launch waits for a
 * pick. Native peer: `native/compound/chat/OpenWorkChooser`.
 */
export default function OpenWorkChooser({
  openWork,
  choice,
  busy = false,
  onChoose,
}: OpenWorkChooserProps) {
  const view = processOpenWorkView(openWork)
  return (
    <div
      role="radiogroup"
      aria-label="This story already has open work"
      className="flex flex-col gap-2 rounded-md border border-(--status-working-soft-border) bg-(--status-working-soft-bg) px-2.5 py-2"
    >
      <span className="text-[12.5px] font-semibold text-(--text-primary)">{view.headline}</span>
      {view.holds ? (
        <span className="text-[11.5px] text-(--text-secondary)">It holds: {view.holds}</span>
      ) : null}
      {view.adds ? (
        <span className="text-[11.5px] text-(--text-secondary)">This launch adds: {view.adds}</span>
      ) : null}
      {view.warnings.map((warning) => (
        <span key={warning} className="text-[11.5px] font-medium text-(--status-working-soft-fg)">
          {warning}
        </span>
      ))}
      <div className="flex flex-col gap-1.5">
        {view.options.map((option) => {
          const picked = choice === option.choice
          return (
            <button
              key={option.choice}
              type="button"
              role="radio"
              aria-checked={picked}
              disabled={busy || !option.available}
              onClick={() => onChoose(option.choice)}
              className={`flex w-full flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-(--accent-primary) disabled:opacity-50 ${
                picked
                  ? 'border-(--accent-primary) bg-(--accent-primary)/10'
                  : 'border-(--border-default) bg-(--surface-raised) enabled:hover:border-(--accent-primary)'
              }`}
            >
              <span className="flex items-center gap-2 text-[12.5px] font-semibold text-(--text-primary)">
                {option.label}
                {option.risky ? (
                  <span className="rounded-full border border-(--status-stuck-soft-border) bg-(--status-stuck-soft-bg) px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-wide text-(--status-stuck-soft-fg)">
                    {OPEN_WORK_RISKY_TAG}
                  </span>
                ) : null}
              </span>
              <span className="text-[11.5px] leading-snug text-(--text-secondary)">
                {option.available ? option.detail : option.reason}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
