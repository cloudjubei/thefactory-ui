import { useState } from 'react'

import { STORY_READINESS_COPY } from '../../../headless/utils/storyReadinessViewConstants'
import type { StoryReadinessView } from '../../../headless/utils/storyReadinessViewTypes'

export type StoryReadinessBadgeProps = {
  view: StoryReadinessView
  /** Open the feature a problem names. */
  onOpenFeature?: (featureId: string) => void
}

/**
 * A story's readiness: "Ready", or "Not ready · n" opening the list of what it
 * lacks, each feature's problem opening its feature. Native peer:
 * `native/compound/stories/StoryReadinessBadge`.
 */
export default function StoryReadinessBadge({ view, onOpenFeature }: StoryReadinessBadgeProps) {
  const [open, setOpen] = useState(false)
  const chip = (
    <span
      className="inline-flex items-center rounded-full border px-2 text-[11px] font-semibold leading-[18px] whitespace-nowrap"
      style={{
        background: `var(--status-${view.tone}-soft-bg)`,
        color: `var(--status-${view.tone}-soft-fg)`,
        borderColor: `var(--status-${view.tone}-soft-border)`,
      }}
    >
      {view.label}
    </span>
  )
  if (view.ready) return chip
  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        aria-expanded={open}
        aria-label={view.label}
        onClick={() => setOpen((o) => !o)}
        className="cursor-pointer"
      >
        {chip}
      </button>
      {open ? (
        <div className="flex flex-col gap-1 rounded-lg border border-(--border-subtle) bg-(--surface-raised) px-3 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-(--text-secondary)">
            {STORY_READINESS_COPY.heading}
          </span>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {view.problems.map((problem) => {
              const featureId = problem.featureId
              return (
                <li
                  key={problem.key}
                  onClick={featureId && onOpenFeature ? () => onOpenFeature(featureId) : undefined}
                  className={`text-[13px] text-(--text-primary) ${featureId && onOpenFeature ? 'cursor-pointer hover:underline' : ''}`}
                >
                  {problem.message}
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
