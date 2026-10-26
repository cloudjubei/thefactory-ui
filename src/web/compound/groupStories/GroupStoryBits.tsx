import {
  processGroupBadge,
  type GroupStoryRunSummary,
  type ProcessStatusTone,
} from '../../../headless'

/** A group run's state as a soft status pill, the group run page's own badge. */
export function GroupStoryToneBadge({
  tone,
  children,
}: {
  tone: ProcessStatusTone
  children: string
}) {
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-2 py-px text-[10.5px]"
      style={{
        background: `var(--status-${tone}-soft-bg)`,
        color: `var(--status-${tone}-soft-fg)`,
        border: `1px solid var(--status-${tone}-soft-border)`,
      }}
    >
      {children}
    </span>
  )
}

/** A group story's latest run, as a pill that opens it. */
export function GroupStoryRunStatus({
  run,
  onOpen,
}: {
  run: GroupStoryRunSummary
  onOpen: (groupRunId: string) => void
}) {
  const badge = processGroupBadge({ status: run.status, legs: [] })
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onOpen(run.groupRunId)
      }}
      title={run.waitingOn ?? 'Open its group run'}
      className="inline-flex shrink-0 items-center rounded-full focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
    >
      <GroupStoryToneBadge tone={badge.tone}>{badge.label}</GroupStoryToneBadge>
    </button>
  )
}

/** A part's story, as the story chip recipe, opening it. A story that is gone says so. */
export function GroupStoryStoryChip({
  title,
  onOpen,
}: {
  /** Absent when the story cannot be read. */
  title: string | undefined
  onOpen?: () => void
}) {
  if (title === undefined) {
    return (
      <span
        className="chip chip--missing"
        title="This story cannot be read — it may have been deleted."
      >
        Story gone
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onOpen?.()
      }}
      className="chip story chip--ok max-w-full truncate"
      title={title}
    >
      {title}
    </button>
  )
}
