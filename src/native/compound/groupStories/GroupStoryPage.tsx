import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'

import {
  groupStoryNeedTitles,
  groupStoryProgress,
  groupStoryRunBlockedReason,
  groupStoryStepColumns,
  isLiveGroupStoryRun,
  type GroupStoryPartView,
  type GroupStoryView,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'
import { ConfirmDialog } from '../../primitives/Modal'
import Markdown from '../Markdown'
import StatusControl from '../StatusControl'
import { GroupStoryChip, GroupStoryRunStatus, GroupStoryStoryChip } from './GroupStoryBits'

export type GroupStoryPageProps = {
  story: GroupStoryView
  onRun: () => void
  onOpenRun: (groupRunId: string) => void
  onEdit: () => void
  onDelete: () => Promise<void>
  onOpenPartStory: (projectId: string, storyId: string) => void
}

/**
 * Native peer of
 * [web's `GroupStoryPage`](../../../web/compound/groupStories/GroupStoryPage.tsx):
 * one group story, its parts in step sections — Step 1, Step 2 … — each part
 * with its story, status, features done and what it needs; Run, Edit, Delete.
 */
export default function GroupStoryPage({
  story,
  onRun,
  onOpenRun,
  onEdit,
  onDelete,
  onOpenPartStory,
}: GroupStoryPageProps) {
  const { theme, status } = useNativeTheme()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { columns, looping } = groupStoryStepColumns(story)
  const progress = groupStoryProgress(story)
  const live = isLiveGroupStoryRun(story.latestRun)
  const blocked = groupStoryRunBlockedReason(story)
  const partCount = story.partViews.length

  const section = (key: string, label: string, parts: GroupStoryPartView[], stuck = false) => (
    <View key={key} style={{ gap: nativeSpace[2] }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          color: stuck ? status.stuck.softFg : theme.text.muted,
        }}
      >
        {label}
      </Text>
      {parts.map((part) => (
        <PartCard
          key={part.projectId}
          part={part}
          story={story}
          onOpenPartStory={onOpenPartStory}
        />
      ))}
    </View>
  )

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: nativeSpace[6] }}>
      <View
        style={{
          gap: nativeSpace[2],
          paddingHorizontal: nativeSpace[4],
          paddingVertical: nativeSpace[3],
          borderBottomWidth: 1,
          borderBottomColor: theme.border.subtle,
          backgroundColor: theme.surface.raised,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
          <StatusControl status={story.status ?? 'pending'} />
          <Text style={{ fontSize: 12, color: theme.text.muted }}>
            {`${partCount} part${partCount === 1 ? '' : 's'} · ${progress.text}`}
          </Text>
          <View style={{ flex: 1 }} />
          {story.latestRun ? (
            <GroupStoryRunStatus run={story.latestRun} onOpen={onOpenRun} />
          ) : null}
        </View>
        <Text style={{ fontSize: 17, fontWeight: '600', color: theme.text.primary }}>
          {story.title}
        </Text>
        <View style={{ flexDirection: 'row', gap: nativeSpace[2] }}>
          {live ? null : (
            <Button size="sm" variant="run" disabled={blocked !== undefined} onPress={onRun}>
              Run
            </Button>
          )}
          <Button size="sm" variant="secondary" onPress={onEdit}>
            Edit
          </Button>
          <Button size="sm" variant="ghost" onPress={() => setConfirmDelete(true)}>
            Delete
          </Button>
        </View>
        {blocked && !live ? (
          <Text style={{ fontSize: 12, color: theme.text.muted }}>{blocked}</Text>
        ) : null}
      </View>

      <View style={{ gap: nativeSpace[4], padding: nativeSpace[4] }}>
        {story.problems.length > 0 ? (
          <View
            accessibilityRole="alert"
            style={{
              gap: 4,
              padding: nativeSpace[3],
              borderRadius: nativeRadii[2],
              borderWidth: 1,
              backgroundColor: status.stuck.softBg,
              borderColor: status.stuck.softBorder,
            }}
          >
            {story.problems.map((p) => (
              <Text key={p} style={{ fontSize: 12.5, color: status.stuck.softFg }}>
                {p}
              </Text>
            ))}
          </View>
        ) : null}
        {story.description ? <Markdown text={story.description} /> : null}
        {columns.map((column) =>
          section(
            String(column.step),
            column.parts.length > 1 ? `Step ${column.step} · side by side` : `Step ${column.step}`,
            column.parts,
          ),
        )}
        {looping.length > 0 ? section('looping', 'Cannot start', looping, true) : null}
      </View>

      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await onDelete()
          setConfirmDelete(false)
        }}
        title="Delete this group story?"
        description="Its part stories stay in their projects, as they are."
        confirmLabel="Delete"
        destructive
      />
    </ScrollView>
  )
}

function PartCard({
  part,
  story,
  onOpenPartStory,
}: {
  part: GroupStoryPartView
  story: GroupStoryView
  onOpenPartStory: (projectId: string, storyId: string) => void
}) {
  const { theme } = useNativeTheme()
  const needs = groupStoryNeedTitles(part, story)
  return (
    <View
      style={{
        gap: nativeSpace[2],
        padding: nativeSpace[3],
        borderRadius: nativeRadii[3],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.raised,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
        <Text
          numberOfLines={1}
          style={{ flex: 1, fontSize: 14, fontWeight: '600', color: theme.text.primary }}
        >
          {part.projectTitle}
        </Text>
        {part.status ? <StatusControl status={part.status} /> : null}
      </View>
      <View style={{ flexDirection: 'row' }}>
        <GroupStoryStoryChip
          title={part.storyTitle}
          onOpen={() => onOpenPartStory(part.projectId, part.storyId)}
        />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
        <Text style={{ fontSize: 12, color: theme.text.muted }}>
          {part.featuresTotal === 0
            ? 'No features yet'
            : `${part.featuresDone}/${part.featuresTotal} done`}
        </Text>
        {needs.length > 0 ? (
          <>
            <Text style={{ fontSize: 12, color: theme.text.muted }}>· Needs</Text>
            {needs.map((title) => (
              <GroupStoryChip key={title} label={title} tone="blocks" />
            ))}
          </>
        ) : null}
      </View>
    </View>
  )
}
