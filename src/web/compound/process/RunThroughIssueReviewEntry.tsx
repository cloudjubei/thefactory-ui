import {
  RUN_THROUGH_REVIEW_COPY,
  useReferenceRendering,
  useReferences,
  type RunThroughIssueReviewEntryView as Entry,
} from '../../../headless'
import { useReferenceRenderer } from '../../hooks/useReferenceRenderer'
import { Button } from '../../primitives/Button'

export type RunThroughIssueReviewEntryProps = {
  entry: Entry | undefined
  /** The app's project, where the fixes were made. */
  projectName?: string
  /** Opens the panel on the first open issue. */
  onStart?: () => void
}

function StoryChip({ projectId, storyId }: { projectId: string; storyId: string }) {
  const references = useReferences({ scope: { projectId } })
  const onOpen = useReferenceRendering()?.onOpen
  const render = useReferenceRenderer({ references, ...(onOpen ? { onOpen } : {}) })
  return <>{render({ type: 'link', link: { kind: 'story', projectId, storyId } })}</>
}

/**
 * The way into a run-through's issues on its sign-off — "Go over the issues
 * (N)" — or, once they were gone over, how that went and the story of the
 * fixes it made.
 */
export default function RunThroughIssueReviewEntry({
  entry,
  projectName,
  onStart,
}: RunThroughIssueReviewEntryProps) {
  if (!entry) return null
  if (entry.kind === 'start') {
    return onStart ? (
      <div>
        <Button size="sm" onClick={onStart}>
          {entry.label}
        </Button>
      </div>
    ) : null
  }
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-(--text-secondary)">
      <span className="font-medium text-(--text-primary)">{entry.line}</span>
      {entry.storyId ? (
        <>
          <span>· {RUN_THROUGH_REVIEW_COPY.newStory(projectName ?? entry.projectId)}</span>
          <StoryChip projectId={entry.projectId} storyId={entry.storyId} />
        </>
      ) : null}
    </div>
  )
}
