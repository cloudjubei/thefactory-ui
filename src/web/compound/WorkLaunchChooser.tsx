import type { WorkLaunchMode } from 'thefactory-tools/types'
import type { WorkLaunchOptionView } from '../../headless/utils/workLaunchViewTypes'
import { Button } from '../primitives/Button'

export type WorkLaunchChooserProps = {
  /** The two ways, the project's last one first-picked — `workLaunchOptions`. */
  options: WorkLaunchOptionView[]
  /** Start the work this way. The host owns the call. */
  onChoose: (mode: WorkLaunchMode) => void
  /** Close the choice without starting anything. */
  onCancel?: () => void
  busy?: boolean
}

/**
 * The one choice every "start work" makes — a story's or a feature's Run, accepting a feature
 * request: a process run, or in this chat. One click starts it; the way the project last went
 * is the primary button. Purely presentational.
 */
export default function WorkLaunchChooser({
  options,
  onChoose,
  onCancel,
  busy,
}: WorkLaunchChooserProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-(--border-subtle) bg-(--surface-base) p-2.5">
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <button
            key={option.mode}
            type="button"
            disabled={busy}
            onClick={() => onChoose(option.mode)}
            aria-label={option.label}
            className={`flex flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left disabled:opacity-60 ${
              option.preselected
                ? 'border-(--accent-primary) bg-(--surface-raised)'
                : 'border-(--border-default) hover:bg-(--surface-hover)'
            }`}
          >
            <span className="text-[13px] font-semibold text-(--text-primary)">{option.label}</span>
            <span className="text-[12px] leading-snug text-(--text-secondary)">{option.hint}</span>
          </button>
        ))}
      </div>
      {onCancel ? (
        <div className="flex justify-end">
          <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        </div>
      ) : null}
    </div>
  )
}
