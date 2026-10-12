import { Tooltip, StoryAndFeatureCallout } from '../..'
import { contextInfoStory, useProcessRun } from '../../../headless'
import ProcessRunChip from '../process/ProcessRunChip'

export type ContextInfoButtonProps = {
  storyId?: string
  featureId?: string
  /** The process run the chat belongs to: the callout shows the run and its story / feature. */
  processRunId?: string
  /** Opens the run's pipeline from the run card. */
  onOpenProcessRun?: (processRunId: string) => void
  label?: string
  className?: string
}

// "i" pill that opens a popover showing the story / feature this context
// belongs to. Used by chat headers / agent run rows. Web's port leans on
// `Tooltip`'s click-to-pin behaviour (Enter/click toggles, Esc / outside-
// click closes) — desktop hand-rolled the popover with `createPortal` and
// custom positioning, but `Tooltip` already covers that.
export default function ContextInfoButton({
  storyId,
  featureId,
  processRunId,
  onOpenProcessRun,
  label,
  className = '',
}: ContextInfoButtonProps) {
  const hasAny = !!(storyId || featureId)

  const content = processRunId ? (
    <ProcessRunContextItems
      processRunId={processRunId}
      storyId={storyId}
      featureId={featureId}
      onOpenProcessRun={onOpenProcessRun}
    />
  ) : hasAny ? (
    <StoryAndFeatureCallout storyId={storyId} featureId={featureId} />
  ) : (
    <div className="text-xs px-1 py-0.5" style={{ color: 'var(--text-secondary)' }}>
      No contextual items.
    </div>
  )

  return (
    <Tooltip
      content={content}
      placement="bottom"
      anchorAs="button"
      anchorClassName={[
        'inline-flex items-center justify-center w-6 h-6 rounded-full',
        'border bg-transparent no-drag',
        'border-(--color-blue-500) text-(--color-blue-600)',
        'hover:bg-(--color-blue-50) dark:hover:bg-(--color-blue-900)/20',
        'focus:outline-none focus:ring-2 focus:ring-(--color-blue-500)/50',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      anchorTabIndex={0}
    >
      <span className="text-[11px] font-semibold" aria-label={label || 'Chat context information'}>
        i
      </span>
    </Tooltip>
  )
}

function ProcessRunContextItems({
  processRunId,
  storyId,
  featureId,
  onOpenProcessRun,
}: {
  processRunId: string
  storyId?: string
  featureId?: string
  onOpenProcessRun?: (processRunId: string) => void
}) {
  const { run } = useProcessRun(processRunId)
  const story = contextInfoStory({ storyId, featureId }, run)
  return (
    <div className="flex w-[280px] max-w-full flex-col gap-2">
      <ProcessRunChip processRunId={processRunId} onOpen={(id) => onOpenProcessRun?.(id)} />
      <StoryAndFeatureCallout storyId={story.storyId} featureId={story.featureId} />
    </div>
  )
}
