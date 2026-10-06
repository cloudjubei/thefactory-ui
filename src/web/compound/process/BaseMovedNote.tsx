import { processBaseMovedView, type ProcessResumeChoice, type ProcessRun } from '../../../headless'
import { Button } from '../../primitives/Button'

export type BaseMovedNoteProps = {
  run: ProcessRun
  onChoose: (choice: ProcessResumeChoice) => void
}

/**
 * What a run says about its base branch beside its pipeline: that it has moved
 * on — with the choice to bring it in and re-check while the run's park offers
 * it — and the newest time it was brought in.
 */
export default function BaseMovedNote({ run, onChoose }: BaseMovedNoteProps) {
  const view = processBaseMovedView(run)
  if (!view) return null
  return (
    <div className="mx-3 mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-(--border-subtle) bg-(--surface-base) px-2.5 py-2">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {view.note ? (
          <span className="text-[12px] font-medium text-(--text-primary)">{view.note}</span>
        ) : null}
        {view.lastUpdate ? (
          <span className="text-[11px] text-(--text-secondary)">{view.lastUpdate}</span>
        ) : null}
      </div>
      {view.choice ? (
        <Button
          size="sm"
          variant={view.choice.primary ? 'primary' : 'secondary'}
          title={view.choice.detail}
          onClick={() => onChoose(view.choice!.choice)}
        >
          {view.choice.label}
        </Button>
      ) : null}
    </div>
  )
}
