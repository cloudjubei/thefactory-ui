import { Fragment } from 'react'

import {
  groupStoryProgress,
  groupStoryRunBlockedReason,
  groupStoryStepColumns,
  isLiveGroupStoryRun,
  type GroupStoryView,
} from '../../../headless'
import { Button } from '../../primitives/Button'
import { IconPlus } from '../../icons'
import StatusControl from '../StatusControl'
import { GroupStoryRunStatus } from './GroupStoryBits'

export type GroupStoriesListProps = {
  stories: readonly GroupStoryView[]
  /** Open a group story's page — what a click on its row does. */
  onOpenStory: (groupStoryId: string) => void
  /** Open the Run dialog of a group story that can run. */
  onRun: (groupStoryId: string) => void
  /** Open a group story's live or last group run. */
  onOpenRun: (groupRunId: string) => void
  /** Start a new group story; no button without it. */
  onNew?: () => void
  /** Still reading them: nothing is listed yet. */
  loading?: boolean
}

/**
 * A group's group stories, one row each like a project's stories list: its
 * status, title, features done across its parts, its parts in the order they
 * run (→ between steps), and Run — or, while a run is going, where it stands.
 */
export default function GroupStoriesList({
  stories,
  onOpenStory,
  onRun,
  onOpenRun,
  onNew,
  loading = false,
}: GroupStoriesListProps) {
  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-(--border-subtle) px-4 py-2.5">
        <h2 className="text-[13px] font-semibold text-(--text-primary)">Stories</h2>
        <span className="text-[11.5px] text-(--text-muted)">
          {loading ? '' : `${stories.length} across this group’s projects`}
        </span>
        <span className="grow" />
        {onNew ? (
          <Button size="sm" variant="primary" onClick={onNew}>
            <IconPlus className="size-3.5" />
            New group story
          </Button>
        ) : null}
      </div>
      {loading ? (
        <p className="px-4 py-6 text-[12.5px] text-(--text-secondary)">Loading…</p>
      ) : stories.length === 0 ? (
        <p className="px-4 py-6 text-[12.5px] text-(--text-secondary)">
          No group stories yet. A group story keeps one feature’s stories across this group’s
          projects together, so they run as one.
        </p>
      ) : (
        <ul role="list" className="flex flex-col">
          {stories.map((story) => (
            <GroupStoryRow
              key={story.id}
              story={story}
              onOpen={() => onOpenStory(story.id)}
              onRun={() => onRun(story.id)}
              onOpenRun={onOpenRun}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function GroupStoryRow({
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
  const { columns, looping } = groupStoryStepColumns(story)
  const progress = groupStoryProgress(story)
  const live = isLiveGroupStoryRun(story.latestRun)
  const blocked = groupStoryRunBlockedReason(story)
  return (
    <li className="border-b border-(--border-subtle)">
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onOpen()
          }
        }}
        className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-4 py-2.5 hover:bg-(--surface-hover) focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
      >
        <div className="flex flex-col items-center gap-1">
          <StatusControl status={story.status ?? 'pending'} />
          <span className="chips-sub__label" title="Features done across every part">
            {progress.text}
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="truncate text-[13px] font-medium text-(--text-primary)">
            {story.title}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {columns.map((column, i) => (
              <Fragment key={column.step}>
                {i > 0 ? (
                  <span aria-hidden className="text-[11px] text-(--text-muted)">
                    →
                  </span>
                ) : null}
                {column.parts.map((part) => (
                  <span
                    key={part.projectId}
                    className="chip"
                    title={`${part.projectTitle}: ${part.storyTitle ?? 'story gone'} — ${part.featuresDone}/${part.featuresTotal} done`}
                  >
                    {part.projectTitle}
                  </span>
                ))}
              </Fragment>
            ))}
            {looping.map((part) => (
              <span
                key={part.projectId}
                className="chip chip--missing"
                title="Caught in a loop of needs"
              >
                {part.projectTitle}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-end">
          {live && story.latestRun ? (
            <GroupStoryRunStatus run={story.latestRun} onOpen={onOpenRun} />
          ) : (
            <Button
              size="sm"
              variant="run"
              disabled={blocked !== undefined}
              title={blocked ?? 'Run every part as one group run'}
              onClick={(e) => {
                e.stopPropagation()
                onRun()
              }}
            >
              Run
            </Button>
          )}
        </div>
      </div>
    </li>
  )
}
