import { runCarriedOutChangesView } from '../../../headless'
import type { ProcessRun } from '../../../headless'
import DependencyBullet from '../stories/DependencyBullet'

export type RunCarriedOutChangesProps = {
  run: ProcessRun
}

/**
 * The feature edits the run carried out itself, oldest first, beside the changes still waiting:
 * each feature with its kind and what changed. Hidden when there are none.
 */
export default function RunCarriedOutChanges({ run }: RunCarriedOutChangesProps) {
  const view = runCarriedOutChangesView(run)
  if (!view) return null

  return (
    <section
      aria-label={view.title}
      className="mx-3 mt-3 flex flex-col gap-2 rounded-lg border border-(--status-done-soft-border) bg-(--status-done-soft-bg) px-3 py-2.5"
    >
      <div className="text-[12.5px] font-semibold text-(--text-primary)">{view.title}</div>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {view.items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] text-(--text-secondary)"
          >
            {run.storyId ? (
              <DependencyBullet dependency={`${run.storyId}.${item.featureId}`} interactive />
            ) : (
              <span className="font-medium text-(--text-primary)">{item.name}</span>
            )}
            <span>{item.kindWord}</span>
            <span className="min-w-0">— {item.summary}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
