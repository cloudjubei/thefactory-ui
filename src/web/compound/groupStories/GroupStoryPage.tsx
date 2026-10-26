import { useState } from 'react'

import {
  groupStoryNeedTitles,
  groupStoryProgress,
  groupStoryRunBlockedReason,
  groupStoryStepColumns,
  isLiveGroupStoryRun,
  type GroupStoryPartView,
  type GroupStoryView,
} from '../../../headless'
import { Button } from '../../primitives/Button'
import { ConfirmDialog } from '../../primitives/Modal'
import Markdown from '../Markdown'
import StatusControl from '../StatusControl'
import { GroupStoryRunStatus, GroupStoryStoryChip } from './GroupStoryBits'

export type GroupStoryPageProps = {
  story: GroupStoryView
  /** Open the Run dialog. */
  onRun: () => void
  /** Open its live or last group run. */
  onOpenRun: (groupRunId: string) => void
  onEdit: () => void
  /** Delete it, after the person confirms; its part stories stay. */
  onDelete: () => Promise<void>
  /** Open a part's story in its project. */
  onOpenPartStory: (projectId: string, storyId: string) => void
}

/**
 * One group story: its parts by the step they run in — parts in one step run
 * side by side, each step after the ones it needs — with every part's story,
 * status, features done and what it needs, why it cannot run, and Run.
 */
export default function GroupStoryPage({
  story,
  onRun,
  onOpenRun,
  onEdit,
  onDelete,
  onOpenPartStory,
}: GroupStoryPageProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { columns, looping } = groupStoryStepColumns(story)
  const progress = groupStoryProgress(story)
  const live = isLiveGroupStoryRun(story.latestRun)
  const blocked = groupStoryRunBlockedReason(story)
  const partCount = story.partViews.length

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-(--border-subtle) bg-(--surface-raised) px-4 py-2.5">
        <StatusControl status={story.status ?? 'pending'} />
        <h1 className="min-w-0 truncate text-[14px] font-semibold text-(--text-primary)">
          {story.title}
        </h1>
        <span className="text-[11.5px] text-(--text-muted)">
          {partCount} part{partCount === 1 ? '' : 's'} · {progress.text}
        </span>
        <span className="grow" />
        {story.latestRun ? <GroupStoryRunStatus run={story.latestRun} onOpen={onOpenRun} /> : null}
        {live ? null : (
          <Button
            size="sm"
            variant="run"
            disabled={blocked !== undefined}
            title={blocked ?? 'Run every part as one group run'}
            onClick={onRun}
          >
            Run
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={onEdit}>
          Edit
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)}>
          Delete
        </Button>
      </div>

      <div className="flex flex-col gap-4 px-4 py-4">
        {story.problems.length > 0 ? (
          <div
            role="alert"
            className="flex flex-col gap-1 rounded-md px-3 py-2 text-[12px]"
            style={{
              background: 'var(--status-stuck-soft-bg)',
              border: '1px solid var(--status-stuck-soft-border)',
              color: 'var(--status-stuck-soft-fg)',
            }}
          >
            {story.problems.map((p) => (
              <span key={p}>{p}</span>
            ))}
          </div>
        ) : null}

        {story.description ? (
          <div className="max-w-[72ch] text-[13px] text-(--text-secondary)">
            <Markdown text={story.description} />
          </div>
        ) : null}

        <div className="flex gap-3 overflow-x-auto pb-1">
          {columns.map((column) => (
            <section
              key={column.step}
              aria-label={`Step ${column.step}`}
              className="flex w-64 shrink-0 flex-col gap-2"
            >
              <h2 className="text-[10.5px] font-semibold uppercase tracking-wider text-(--text-muted)">
                Step {column.step}
                {column.parts.length > 1 ? ' · side by side' : ''}
              </h2>
              {column.parts.map((part) => (
                <PartCard
                  key={part.projectId}
                  part={part}
                  story={story}
                  onOpenPartStory={onOpenPartStory}
                />
              ))}
            </section>
          ))}
          {looping.length > 0 ? (
            <section aria-label="Cannot start" className="flex w-64 shrink-0 flex-col gap-2">
              <h2 className="text-[10.5px] font-semibold uppercase tracking-wider text-(--status-stuck-soft-fg)">
                Cannot start
              </h2>
              {looping.map((part) => (
                <PartCard
                  key={part.projectId}
                  part={part}
                  story={story}
                  onOpenPartStory={onOpenPartStory}
                />
              ))}
            </section>
          ) : null}
        </div>
      </div>

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
    </div>
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
  const needs = groupStoryNeedTitles(part, story)
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-(--border-subtle) bg-(--surface-raised) p-3">
      <div className="flex items-center gap-2">
        <span className="min-w-0 truncate text-[12.5px] font-semibold text-(--text-primary)">
          {part.projectTitle}
        </span>
        <span className="grow" />
        {part.status ? <StatusControl status={part.status} /> : null}
      </div>
      <div className="flex min-w-0">
        <GroupStoryStoryChip
          title={part.storyTitle}
          onOpen={() => onOpenPartStory(part.projectId, part.storyId)}
        />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="chips-sub__label">
          {part.featuresTotal === 0
            ? 'No features yet'
            : `${part.featuresDone}/${part.featuresTotal} done`}
        </span>
        {needs.length > 0 ? (
          <>
            <span className="text-[11px] text-(--text-muted)">Needs</span>
            {needs.map((title) => (
              <span key={title} className="chip chip--blocks">
                {title}
              </span>
            ))}
          </>
        ) : null}
      </div>
    </div>
  )
}
