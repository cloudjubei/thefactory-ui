import { Fragment } from 'react'
import { Pressable, Text, View } from 'react-native'

import {
  groupStoryProgress,
  groupStoryRunBlockedReason,
  groupStoryStepColumns,
  isLiveGroupStoryRun,
  type GroupStoryView,
} from '../../../headless'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'
import StatusControl from '../StatusControl'
import { GroupStoryChip, GroupStoryRunStatus } from './GroupStoryBits'

export type GroupStoriesListProps = {
  stories: readonly GroupStoryView[]
  onOpenStory: (groupStoryId: string) => void
  onRun: (groupStoryId: string) => void
  onOpenRun: (groupRunId: string) => void
  onNew?: () => void
  loading?: boolean
}

/**
 * Native peer of
 * [web's `GroupStoriesList`](../../../web/compound/groupStories/GroupStoriesList.tsx):
 * a group's group stories, one row each — status, title, features done, its
 * parts in the order they run, and Run or its live run.
 */
export default function GroupStoriesList({
  stories,
  onOpenStory,
  onRun,
  onOpenRun,
  onNew,
  loading = false,
}: GroupStoriesListProps) {
  const { theme } = useNativeTheme()
  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: nativeSpace[2],
          paddingHorizontal: nativeSpace[4],
          paddingVertical: nativeSpace[3],
          borderBottomWidth: 1,
          borderBottomColor: theme.border.subtle,
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text.primary }}>Stories</Text>
        <View style={{ flex: 1 }} />
        {onNew ? (
          <Button size="sm" variant="primary" onPress={onNew}>
            New
          </Button>
        ) : null}
      </View>
      {loading ? (
        <Text style={{ padding: nativeSpace[4], fontSize: 13, color: theme.text.secondary }}>
          Loading…
        </Text>
      ) : stories.length === 0 ? (
        <Text style={{ padding: nativeSpace[4], fontSize: 13, color: theme.text.secondary }}>
          No group stories yet. A group story keeps one feature’s stories across this group’s
          projects together, so they run as one.
        </Text>
      ) : (
        stories.map((story) => (
          <Row
            key={story.id}
            story={story}
            onOpen={() => onOpenStory(story.id)}
            onRun={() => onRun(story.id)}
            onOpenRun={onOpenRun}
          />
        ))
      )}
    </View>
  )
}

function Row({
  story,
  onOpen,
  onRun,
  onOpenRun,
}: {
  story: GroupStoryView
  onOpen: () => void
  onRun: () => void
  onOpenRun: (groupRunId: string) => void
}) {
  const { theme } = useNativeTheme()
  const { columns, looping } = groupStoryStepColumns(story)
  const progress = groupStoryProgress(story)
  const live = isLiveGroupStoryRun(story.latestRun)
  const blocked = groupStoryRunBlockedReason(story)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${story.title}, ${progress.text}`}
      onPress={onOpen}
      style={({ pressed }) => ({
        gap: nativeSpace[2],
        paddingHorizontal: nativeSpace[4],
        paddingVertical: nativeSpace[3],
        borderBottomWidth: 1,
        borderBottomColor: theme.border.subtle,
        backgroundColor: pressed ? theme.surface.hover : 'transparent',
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
        <StatusControl status={story.status ?? 'pending'} />
        <Text
          numberOfLines={2}
          style={{ flex: 1, fontSize: 14, fontWeight: '500', color: theme.text.primary }}
        >
          {story.title}
        </Text>
        {live && story.latestRun ? (
          <GroupStoryRunStatus run={story.latestRun} onOpen={onOpenRun} />
        ) : (
          <Button
            size="sm"
            variant="run"
            disabled={blocked !== undefined}
            accessibilityLabel={blocked ?? 'Run every part as one group run'}
            onPress={onRun}
          >
            Run
          </Button>
        )}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
        <Text style={{ fontSize: 11, color: theme.text.muted }}>{progress.text}</Text>
        {columns.map((column, i) => (
          <Fragment key={column.step}>
            {i > 0 ? <Text style={{ fontSize: 11, color: theme.text.muted }}>→</Text> : null}
            {column.parts.map((part) => (
              <GroupStoryChip key={part.projectId} label={part.projectTitle} />
            ))}
          </Fragment>
        ))}
        {looping.map((part) => (
          <GroupStoryChip key={part.projectId} label={part.projectTitle} tone="missing" />
        ))}
      </View>
    </Pressable>
  )
}
