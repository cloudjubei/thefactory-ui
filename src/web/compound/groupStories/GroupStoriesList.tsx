import { Fragment, useMemo, useRef, useState, type KeyboardEvent } from 'react'

import {
  filterGroupStories,
  GROUP_STORY_ALL_PROJECTS,
  GROUP_STORY_RUN_FILTER_OPTIONS,
  GROUP_STORY_SORT_OPTIONS,
  groupStoryListCount,
  groupStoryListProjects,
  groupStoryProgress,
  groupStoryRunBlockedReason,
  groupStoryStepColumns,
  isLiveGroupStoryRun,
  STATUS_LABELS,
  STATUS_ORDER,
  statusKey,
  type GroupStoryListFilter,
  type GroupStoryRunFilter,
  type GroupStorySorting,
  type GroupStoryView,
  type StatusPickerValue,
} from '../../../headless'
import { Button } from '../../primitives/Button'
import SegmentedControl from '../../primitives/SegmentedControl'
import { IconBoard, IconList, IconPlus } from '../../icons'
import { OptionPicker } from '../OptionPicker'
import StatusControl, { StatusPicker } from '../StatusControl'
import { GroupStoryRunStatus } from './GroupStoryBits'

export type GroupStoriesListProps = {
  stories: readonly GroupStoryView[]
  /** What the tab shows — search, filters, order and layout — and how it changes. */
  filter: GroupStoryListFilter
  onFilterChange: (change: Partial<GroupStoryListFilter>) => void
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

type RowActions = {
  onOpen: () => void
  onRun: () => void
  onOpenRun: (groupRunId: string) => void
}

/**
 * A group's group stories the way a project's Home lists its stories: search,
 * status, project and run filters, the order, how many show of how many, and
 * List or Board. A row has its place in the group's order, status, title,
 * features done across its parts, its parts in the order they run (→ between
 * steps), and Run — or, while a run is going, where it stands.
 */
export default function GroupStoriesList({
  stories,
  filter,
  onFilterChange,
  onOpenStory,
  onRun,
  onOpenRun,
  onNew,
  loading = false,
}: GroupStoriesListProps) {
  const shown = useMemo(() => filterGroupStories(stories, filter), [stories, filter])
  const position = useMemo(() => new Map(stories.map((s, i) => [s.id, i + 1])), [stories])
  const actions = (story: GroupStoryView): RowActions => ({
    onOpen: () => onOpenStory(story.id),
    onRun: () => onRun(story.id),
    onOpenRun,
  })
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="stories-menubar shrink-0">
        <div className="left">
          <h2 className="text-[13px] font-semibold text-(--text-primary)">Stories</h2>
        </div>
        <div className="center">
          <SegmentedControl
            ariaLabel="Toggle between list and board views"
            options={[
              { value: 'list', label: 'List', icon: <IconList /> },
              { value: 'board', label: 'Board', icon: <IconBoard /> },
            ]}
            value={filter.layout}
            onChange={(v) => onFilterChange({ layout: v === 'board' ? 'board' : 'list' })}
            size="sm"
          />
        </div>
        <div className="right flex items-center gap-2">
          {onNew ? (
            <Button size="sm" variant="primary" onClick={onNew}>
              <IconPlus className="size-3.5" />
              New group story
            </Button>
          ) : null}
        </div>
      </div>
      <GroupStoriesToolbar stories={stories} filter={filter} onFilterChange={onFilterChange} />
      <div className="stories-toolbar shrink-0">
        <div className="left">
          <div className="stories-count shrink-0" aria-live="polite">
            {loading ? '' : groupStoryListCount(shown.length, stories.length)}
          </div>
        </div>
        <div className="right" />
      </div>
      {loading ? (
        <p className="px-4 py-6 text-[12.5px] text-(--text-secondary)">Loading…</p>
      ) : stories.length === 0 ? (
        <p className="px-4 py-6 text-[12.5px] text-(--text-secondary)">
          No group stories yet. A group story keeps one feature’s stories across this group’s
          projects together, so they run as one.
        </p>
      ) : shown.length === 0 ? (
        <p className="px-4 py-6 text-[12.5px] text-(--text-secondary)">
          No group stories match these filters.
        </p>
      ) : filter.layout === 'board' ? (
        <GroupStoriesBoard stories={shown} position={position} actions={actions} />
      ) : (
        <ul role="list" aria-label="Group stories" className="flex flex-col">
          {shown.map((story) => (
            <GroupStoryRow
              key={story.id}
              story={story}
              position={position.get(story.id)}
              {...actions(story)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function GroupStoriesToolbar({
  stories,
  filter,
  onFilterChange,
}: {
  stories: readonly GroupStoryView[]
  filter: GroupStoryListFilter
  onFilterChange: (change: Partial<GroupStoryListFilter>) => void
}) {
  const projects = useMemo(() => groupStoryListProjects(stories), [stories])
  const projectOptions = useMemo(
    () => [
      { value: '', label: GROUP_STORY_ALL_PROJECTS },
      ...projects.map((p) => ({ value: p.id, label: p.title })),
    ],
    [projects],
  )
  const projectLabel =
    projects.find((p) => p.id === filter.projectId)?.title ?? GROUP_STORY_ALL_PROJECTS
  return (
    <div className="stories-toolbar stories-searchbar shrink-0">
      <div className="left flex w-full flex-wrap items-center gap-2">
        <div className="control search-wrapper min-w-0 flex-1 basis-full sm:basis-auto">
          <input
            type="search"
            placeholder="Search by number, title, project or story"
            aria-label="Search group stories"
            value={filter.query}
            onChange={(e) => onFilterChange({ query: e.target.value })}
          />
        </div>
        <div className="flex basis-full flex-wrap gap-2 sm:basis-auto">
          <StatusFilter value={filter.status} onChange={(status) => onFilterChange({ status })} />
          <PickerControl
            ariaLabel="Filter by project"
            label={projectLabel}
            value={filter.projectId ?? ''}
            options={projectOptions}
            onSelect={(v) => onFilterChange({ projectId: v === '' ? undefined : v })}
          />
          <PickerControl
            ariaLabel="Filter by run"
            label={GROUP_STORY_RUN_FILTER_OPTIONS.find((o) => o.value === filter.run)?.label ?? ''}
            value={filter.run}
            options={GROUP_STORY_RUN_FILTER_OPTIONS}
            onSelect={(v) => onFilterChange({ run: v as GroupStoryRunFilter })}
          />
          <PickerControl
            ariaLabel="Sort by"
            label={GROUP_STORY_SORT_OPTIONS.find((o) => o.value === filter.sortBy)?.label ?? ''}
            value={filter.sortBy}
            options={GROUP_STORY_SORT_OPTIONS}
            onSelect={(v) => onFilterChange({ sortBy: v as GroupStorySorting })}
          />
        </div>
      </div>
      <div className="right" />
    </div>
  )
}

function useAnchoredPicker() {
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const trigger = {
    ref,
    role: 'button' as const,
    tabIndex: 0,
    'aria-haspopup': 'menu' as const,
    'aria-expanded': open,
    onClick: () => setOpen(true),
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setOpen(true)
      }
    },
  }
  return { ref, open, close: () => setOpen(false), trigger }
}

function StatusFilter({
  value,
  onChange,
}: {
  value: StatusPickerValue
  onChange: (value: StatusPickerValue) => void
}) {
  const picker = useAnchoredPicker()
  const label = value === 'all' ? 'All' : value === 'not-done' ? 'Not done' : STATUS_LABELS[value]
  const bullet = value === 'all' || value === 'not-done' ? 'queued' : statusKey(value)
  return (
    <div className="control flex-1 sm:flex-none">
      <div
        {...picker.trigger}
        className="status-filter-btn ui-select gap-2"
        aria-label="Filter by status"
      >
        <span className={`status-bullet status-bullet--${bullet}`} aria-hidden />
        <span className="standard-picker__label">{label}</span>
      </div>
      {picker.open && picker.ref.current ? (
        <StatusPicker
          anchorEl={picker.ref.current}
          value={value}
          isAllAllowed
          includeNotDone
          onSelect={(next) => {
            onChange(next)
            picker.close()
          }}
          onClose={picker.close}
        />
      ) : null}
    </div>
  )
}

function PickerControl({
  ariaLabel,
  label,
  value,
  options,
  onSelect,
}: {
  ariaLabel: string
  label: string
  value: string
  options: ReadonlyArray<{ value: string; label: string }>
  onSelect: (value: string) => void
}) {
  const picker = useAnchoredPicker()
  return (
    <div className="control flex-1 sm:flex-none">
      <div {...picker.trigger} className="status-filter-btn ui-select" aria-label={ariaLabel}>
        <span className="standard-picker__label">{label}</span>
      </div>
      {picker.open && picker.ref.current ? (
        <OptionPicker
          anchorEl={picker.ref.current}
          value={value}
          options={options}
          ariaLabel={ariaLabel}
          onSelect={(next) => {
            onSelect(next)
            picker.close()
          }}
          onClose={picker.close}
        />
      ) : null}
    </div>
  )
}

function GroupStoryParts({ story }: { story: GroupStoryView }) {
  const { columns, looping } = groupStoryStepColumns(story)
  return (
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
        <span key={part.projectId} className="chip chip--missing" title="Caught in a loop of needs">
          {part.projectTitle}
        </span>
      ))}
    </div>
  )
}

function GroupStoryRunAction({
  story,
  onRun,
  onOpenRun,
}: { story: GroupStoryView } & Omit<RowActions, 'onOpen'>) {
  const blocked = groupStoryRunBlockedReason(story)
  if (isLiveGroupStoryRun(story.latestRun) && story.latestRun) {
    return <GroupStoryRunStatus run={story.latestRun} onOpen={onOpenRun} />
  }
  return (
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
  )
}

function openOnKey(onOpen: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onOpen()
    }
  }
}

function GroupStoryRow({
  story,
  position,
  onOpen,
  onRun,
  onOpenRun,
}: { story: GroupStoryView; position: number | undefined } & RowActions) {
  const progress = groupStoryProgress(story)
  return (
    <li className="border-b border-(--border-subtle)">
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={openOnKey(onOpen)}
        className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-4 py-2.5 hover:bg-(--surface-hover) focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
      >
        <div className="flex flex-col items-center gap-1">
          {position !== undefined ? <span className="id-chip">{position}</span> : null}
          <StatusControl status={story.status ?? 'pending'} />
          <span className="chips-sub__label" title="Features done across every part">
            {progress.text}
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="truncate text-[13px] font-medium text-(--text-primary)">
            {story.title}
          </span>
          <GroupStoryParts story={story} />
        </div>
        <div className="flex items-center justify-end">
          <GroupStoryRunAction story={story} onRun={onRun} onOpenRun={onOpenRun} />
        </div>
      </div>
    </li>
  )
}

function GroupStoriesBoard({
  stories,
  position,
  actions,
}: {
  stories: readonly GroupStoryView[]
  position: ReadonlyMap<string, number>
  actions: (story: GroupStoryView) => RowActions
}) {
  const columns = STATUS_ORDER.map((status) => ({
    status,
    stories: stories.filter((s) => (s.status ?? 'pending') === status),
  }))
  return (
    <div className="flex min-h-0 w-full flex-1 flex-row gap-3 overflow-x-auto p-3">
      {columns.map((col) => (
        <section
          key={col.status}
          aria-label={`${STATUS_LABELS[col.status]} column`}
          className="flex min-h-0 w-72 shrink-0 flex-col rounded-lg border border-(--border-subtle)"
        >
          <header className="flex shrink-0 items-center justify-between border-b border-(--border-subtle) px-2 py-2">
            <StatusControl status={col.status} />
            <span className="text-xs tabular-nums opacity-60">{col.stories.length}</span>
          </header>
          {col.stories.length === 0 ? (
            <p className="px-2 py-2 text-xs opacity-60">No group stories</p>
          ) : (
            <ul className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto p-2">
              {col.stories.map((story) => (
                <GroupStoryCard
                  key={story.id}
                  story={story}
                  position={position.get(story.id)}
                  {...actions(story)}
                />
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}

function GroupStoryCard({
  story,
  position,
  onOpen,
  onRun,
  onOpenRun,
}: { story: GroupStoryView; position: number | undefined } & RowActions) {
  const progress = groupStoryProgress(story)
  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={openOnKey(onOpen)}
        className="flex cursor-pointer flex-col gap-2 rounded-md border border-(--border-subtle) bg-(--surface-raised) p-2.5 hover:bg-(--surface-hover) focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
      >
        <div className="flex items-start gap-2">
          {position !== undefined ? <span className="id-chip shrink-0">{position}</span> : null}
          <span className="min-w-0 flex-1 text-[12.5px] font-medium text-(--text-primary)">
            {story.title}
          </span>
        </div>
        <GroupStoryParts story={story} />
        <div className="flex items-center justify-between gap-2">
          <span className="chips-sub__label" title="Features done across every part">
            {progress.text}
          </span>
          <GroupStoryRunAction story={story} onRun={onRun} onOpenRun={onOpenRun} />
        </div>
      </div>
    </li>
  )
}
