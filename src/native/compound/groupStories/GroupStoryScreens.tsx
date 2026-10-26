import { useMemo, useState, type ReactNode } from 'react'
import { ScrollView, Text, View } from 'react-native'

import {
  groupStoryFormFor,
  useGroupProjectStories,
  useGroupStories,
  useGroupStory,
  useGroupStoryRun,
  useGroupStoryRunPreview,
  type GroupStoryMemberProject,
  type GroupStoryRunBody,
  type LaunchModelChipSlot,
} from '../../../headless'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Alert from '../../primitives/Alert'
import GroupStoriesList from './GroupStoriesList'
import { GroupStoryFormDialog } from './GroupStoryForm'
import GroupStoryPage from './GroupStoryPage'
import GroupStoryRunDialog, { type GroupStoryRunStarted } from './GroupStoryRunDialog'

type RunTarget = { groupId: string; groupStoryId: string; title: string }

function RunDialogConnected({
  target,
  onClose,
  run,
  renderModelChip,
  onOpenRun,
}: {
  target: RunTarget | undefined
  onClose: () => void
  run: (body: GroupStoryRunBody) => Promise<GroupStoryRunStarted>
  renderModelChip?: (picked: LaunchModelChipSlot) => ReactNode
  onOpenRun: (groupRunId: string) => void
}) {
  const preview = useGroupStoryRunPreview(
    target?.groupId,
    target?.groupStoryId,
    target !== undefined,
  )
  return (
    <GroupStoryRunDialog
      isOpen={target !== undefined}
      onClose={onClose}
      title={target?.title ?? ''}
      preview={preview.preview}
      previewLoading={preview.loading}
      {...(preview.error ? { previewError: preview.error } : {})}
      basePicks={preview.basePicks}
      onPickBase={preview.pickBase}
      {...(renderModelChip ? { renderModelChip } : {})}
      onStart={run}
      onOpenRun={onOpenRun}
    />
  )
}

function useMemberStories(members: readonly GroupStoryMemberProject[], open: boolean) {
  const ids = useMemo(() => (open ? members.map((m) => m.id) : []), [members, open])
  return useGroupProjectStories(ids)
}

export type GroupStoriesScreenProps = {
  groupId: string
  members: readonly GroupStoryMemberProject[]
  onOpenStory: (groupStoryId: string) => void
  onOpenRun: (groupRunId: string) => void
  renderModelChip?: (picked: LaunchModelChipSlot) => ReactNode
}

/** Native peer of web's `GroupStoriesScreen`: a group's Stories tab, a new one, and Run from a row. */
export function GroupStoriesScreen({
  groupId,
  members,
  onOpenStory,
  onOpenRun,
  renderModelChip,
}: GroupStoriesScreenProps) {
  const { stories, isLoaded, loadError, createStory, refresh } = useGroupStories(groupId)
  const [creating, setCreating] = useState(false)
  const [runTarget, setRunTarget] = useState<RunTarget>()
  const storiesByProject = useMemberStories(members, creating)
  const runner = useGroupStoryRun(groupId, runTarget?.groupStoryId, refresh)
  const initialForm = useMemo(() => groupStoryFormFor(members), [members])

  return (
    <ScrollView>
      {loadError ? <Alert variant="error">{loadError.message}</Alert> : null}
      <GroupStoriesList
        stories={stories}
        loading={!isLoaded}
        onOpenStory={onOpenStory}
        onOpenRun={onOpenRun}
        onNew={() => setCreating(true)}
        onRun={(id) => {
          const story = stories.find((s) => s.id === id)
          if (story) setRunTarget({ groupId, groupStoryId: id, title: story.title })
        }}
      />
      <GroupStoryFormDialog
        isOpen={creating}
        onClose={() => setCreating(false)}
        mode="new"
        initialForm={initialForm}
        storiesByProject={storiesByProject}
        onSave={async (body) => {
          const created = await createStory(body)
          onOpenStory(created.id)
        }}
      />
      <RunDialogConnected
        target={runTarget}
        onClose={() => setRunTarget(undefined)}
        run={(body) => runner.run(body)}
        {...(renderModelChip ? { renderModelChip } : {})}
        onOpenRun={onOpenRun}
      />
    </ScrollView>
  )
}

export type GroupStoryScreenProps = {
  groupId: string
  groupStoryId: string
  members: readonly GroupStoryMemberProject[]
  onOpenPartStory: (projectId: string, storyId: string) => void
  onOpenRun: (groupRunId: string) => void
  onDeleted: () => void
  renderModelChip?: (picked: LaunchModelChipSlot) => ReactNode
}

/** Native peer of web's `GroupStoryScreen`: one group story's page, with its Edit and Run dialogs. */
export function GroupStoryScreen({
  groupId,
  groupStoryId,
  members,
  onOpenPartStory,
  onOpenRun,
  onDeleted,
  renderModelChip,
}: GroupStoryScreenProps) {
  const { theme } = useNativeTheme()
  const { story, isLoaded, loadError, updateStory, deleteStory, run } = useGroupStory(
    groupId,
    groupStoryId,
  )
  const [editing, setEditing] = useState(false)
  const [running, setRunning] = useState(false)
  const storiesByProject = useMemberStories(members, editing)
  const initialForm = useMemo(() => groupStoryFormFor(members, story), [members, story])

  if (loadError) return <Alert variant="error">{loadError.message}</Alert>
  if (!isLoaded) {
    return (
      <View style={{ padding: nativeSpace[4] }}>
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>Loading…</Text>
      </View>
    )
  }
  if (!story) return <Alert variant="error">This group story no longer exists.</Alert>

  return (
    <>
      <GroupStoryPage
        story={story}
        onRun={() => setRunning(true)}
        onOpenRun={onOpenRun}
        onEdit={() => setEditing(true)}
        onDelete={async () => {
          await deleteStory(story.id)
          onDeleted()
        }}
        onOpenPartStory={onOpenPartStory}
      />
      <GroupStoryFormDialog
        isOpen={editing}
        onClose={() => setEditing(false)}
        mode="edit"
        initialForm={initialForm}
        storiesByProject={storiesByProject}
        onSave={async (body) => {
          await updateStory(story.id, body)
        }}
      />
      <RunDialogConnected
        target={running ? { groupId, groupStoryId, title: story.title } : undefined}
        onClose={() => setRunning(false)}
        run={run}
        {...(renderModelChip ? { renderModelChip } : {})}
        onOpenRun={onOpenRun}
      />
    </>
  )
}
