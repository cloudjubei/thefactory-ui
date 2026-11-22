import { Text, View } from 'react-native'

import {
  RUN_THROUGH_REVIEW_COPY,
  useReferenceRendering,
  useReferences,
  type RunThroughIssueReviewEntryView as Entry,
} from '../../../headless'
import { useNativeTheme } from '../../hooks/useNativeTheme'
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
  const { theme } = useNativeTheme()
  if (!entry) return null
  if (entry.kind === 'start') {
    return onStart ? (
      <View style={{ alignItems: 'flex-start' }}>
        <Button size="sm" onPress={onStart}>
          {entry.label}
        </Button>
      </View>
    ) : null
  }
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
      <Text style={{ fontSize: 13, fontWeight: '500', color: theme.text.primary }}>
        {entry.line}
      </Text>
      {entry.storyId ? (
        <>
          <Text style={{ fontSize: 13, color: theme.text.secondary }}>
            · {RUN_THROUGH_REVIEW_COPY.newStory(projectName ?? entry.projectId)}
          </Text>
          <StoryChip projectId={entry.projectId} storyId={entry.storyId} />
        </>
      ) : null}
    </View>
  )
}
