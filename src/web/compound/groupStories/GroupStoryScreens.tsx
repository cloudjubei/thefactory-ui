import { useMemo, useState, type ReactNode } from 'react'

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
  run: (groupStoryId: string, body: GroupStoryRunBody) => Promise<GroupStoryRunStarted>
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
      onStart={(body) => run(target!.groupStoryId, body)}
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
  /** The group's projects, in its order — the projects a group story's parts come from. */
  members: readonly GroupStoryMemberProject[]
  onOpenStory: (groupStoryId: string) => void
  onOpenRun: (groupRunId: string) => void
  renderModelChip?: (picked: LaunchModelChipSlot) => ReactNode
}

/** A group's Stories tab: its group stories, a new one, and Run from a row. */
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
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
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
        run={(_id, body) => runner.run(body)}
        {...(renderModelChip ? { renderModelChip } : {})}
        onOpenRun={onOpenRun}
      />
    </div>
  )
}

export type GroupStoryScreenProps = {
  groupId: string
  groupStoryId: string
  members: readonly GroupStoryMemberProject[]
  onOpenPartStory: (projectId: string, storyId: string) => void
  onOpenRun: (groupRunId: string) => void
  /** After it was deleted — back to the group's Stories. */
  onDeleted: () => void
  renderModelChip?: (picked: LaunchModelChipSlot) => ReactNode
}

/** One group story's page, with its Edit and Run dialogs. */
export function GroupStoryScreen({
  groupId,
  groupStoryId,
  members,
  onOpenPartStory,
  onOpenRun,
  onDeleted,
  renderModelChip,
}: GroupStoryScreenProps) {
  const { story, isLoaded, loadError, updateStory, deleteStory, run } = useGroupStory(
    groupId,
    groupStoryId,
  )
  const [editing, setEditing] = useState(false)
  const [running, setRunning] = useState(false)
  const storiesByProject = useMemberStories(members, editing)
  const initialForm = useMemo(() => groupStoryFormFor(members, story), [members, story])

  if (loadError) return <Alert variant="error">{loadError.message}</Alert>
  if (!isLoaded) return <div className="p-4 text-sm text-(--text-secondary)">Loading…</div>
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
        run={(_id, body) => run(body)}
        {...(renderModelChip ? { renderModelChip } : {})}
        onOpenRun={onOpenRun}
      />
    </>
  )
}
