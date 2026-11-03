import {
  GROUP_STORY_ACTION_LABELS,
  processGroupBadge,
  type GroupStoryRunSummary,
  type ProcessStatusTone,
} from '../../../headless'
import { IconBack } from '../../icons'
import { Button } from '../../primitives/Button'

/** Back to the group's Stories, as a story page's back button. */
export function GroupStoryBackButton({ onBack }: { onBack: () => void }) {
  return (
    <Button
      variant="secondary"
      size="icon"
      onClick={onBack}
      aria-label={GROUP_STORY_ACTION_LABELS.back}
      title={GROUP_STORY_ACTION_LABELS.back}
    >
      <IconBack className="w-4 h-4" />
    </Button>
  )
}

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
  const badge = processGroupBadge(run)
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
      className="chip story chip--ok min-w-0 max-w-full"
      title={title}
    >
      <span className="min-w-0 truncate">{title}</span>
    </button>
  )
}
