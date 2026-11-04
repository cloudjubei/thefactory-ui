import { Fragment, useId, useMemo, useState, type ReactNode } from 'react'

import {
  GROUP_STORY_ACTION_LABELS,
  GROUP_STORY_PAGE_LABELS,
  groupStoryNeedTitles,
  groupStoryPartsText,
  groupStoryRunButton,
  groupStoryStepColumns,
  markdownSectionKeys,
  markdownSections,
  markdownSummaryLine,
  statusKey,
  statusLabel,
  useGroupStoryFolds,
  type GroupStoryFolds,
  type GroupStoryPartView,
  type GroupStoryView,
  type MarkdownSection,
  type TicketChipView,
} from '../../../headless'
import { IconChevron, IconDelete, IconEdit } from '../../icons'
import { Button } from '../../primitives/Button'
import { ConfirmDialog } from '../../primitives/Modal'
import TicketChip from '../chips/TicketChip'
import Markdown from '../Markdown'
import RunAgentButton from '../RunAgentButton'
import StatusControl from '../StatusControl'
import { GroupStoryBackButton, GroupStoryRunStatus, GroupStoryStoryChip } from './GroupStoryBits'

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
  /** Back to the group's Stories; no back button when unset (a small screen's app bar has it). */
  onBack?: () => void
  /** What is open the first time this group story is shown; later visits find it as it was left. */
  initialFolds?: Partial<GroupStoryFolds>
  /** The ticket it works, opening it in Jira. */
  ticket?: TicketChipView
}

/**
 * One group story, laid out like a story page: its Parts first — by the step
 * they run in, parts in one step side by side — then its Overview, the
 * description folded at its headings so a long one reads one section at a
 * time. Both fold away to one line. Below a desktop's width (the page's own,
 * so a narrow pane counts) the panels run edge to edge and the steps stack.
 */
export default function GroupStoryPage({
  story,
  onRun,
  onOpenRun,
  onEdit,
  onDelete,
  onOpenPartStory,
  onBack,
  initialFolds,
  ticket,
}: GroupStoryPageProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { folds, toggleParts, toggleOverview, toggleSection, setSections } = useGroupStoryFolds(
    story.id,
    initialFolds,
  )
  const { columns, looping } = groupStoryStepColumns(story)
  const partsText = groupStoryPartsText(story)
  const runButton = groupStoryRunButton(story)
  const description = story.description ?? ''
  const doc = useMemo(() => markdownSections(description), [description])
  const sectionKeys = markdownSectionKeys(doc.sections)
  const allOpen = sectionKeys.length > 0 && sectionKeys.every((k) => folds.sections.includes(k))

  return (
    <div className="@container flex h-full min-h-0 flex-col overflow-y-auto">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-(--border-subtle) bg-(--surface-raised) px-4 py-2.5">
        {onBack ? <GroupStoryBackButton onBack={onBack} /> : null}
        <StatusControl status={story.status ?? 'pending'} />
        <h1 className="min-w-0 truncate text-[14px] font-semibold text-(--text-primary) @max-3xl:order-first @max-3xl:line-clamp-2 @max-3xl:basis-full @max-3xl:whitespace-normal @max-3xl:text-[15px]">
          {story.title}
        </h1>
        {ticket ? <TicketChip view={ticket} /> : null}
        <span className="text-[11.5px] text-(--text-muted) @max-3xl:hidden">{partsText}</span>
        <span className="grow" />
        {story.latestRun ? <GroupStoryRunStatus run={story.latestRun} onOpen={onOpenRun} /> : null}
        <div className="flex items-center gap-2">
          {runButton ? (
            <RunAgentButton onClick={onRun} title={runButton.label} disabled={runButton.disabled} />
          ) : null}
          <Button
            variant="secondary"
            size="icon"
            onClick={onEdit}
            aria-label={GROUP_STORY_ACTION_LABELS.edit}
            title={GROUP_STORY_ACTION_LABELS.edit}
          >
            <IconEdit className="w-4 h-4" />
          </Button>
          <Button
            variant="danger"
            size="icon"
            onClick={() => setConfirmDelete(true)}
            aria-label={GROUP_STORY_ACTION_LABELS.delete}
            title={GROUP_STORY_ACTION_LABELS.delete}
          >
            <IconDelete className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4 @max-3xl:gap-0 @max-3xl:p-0">
        {story.problems.length > 0 ? (
          <div
            role="alert"
            className="flex flex-col gap-1 rounded-md px-3 py-2 text-[12px] @max-3xl:m-3"
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

        <FoldPanel
          title={GROUP_STORY_PAGE_LABELS.parts}
          meta={partsText}
          open={folds.parts}
          onToggle={toggleParts}
          folded={<PartsLine columns={columns} looping={looping} />}
        >
          <div className="flex flex-wrap gap-3 pb-1">
            {columns.map((column) => (
              <StepColumn
                key={column.step}
                label={`Step ${column.step}${column.parts.length > 1 ? ' · side by side' : ''}`}
                parts={column.parts}
                story={story}
                onOpenPartStory={onOpenPartStory}
              />
            ))}
            {looping.length > 0 ? (
              <StepColumn
                label="Cannot start"
                stuck
                parts={looping}
                story={story}
                onOpenPartStory={onOpenPartStory}
              />
            ) : null}
          </div>
        </FoldPanel>

        {description.trim() ? (
          <FoldPanel
            title={GROUP_STORY_PAGE_LABELS.overview}
            open={folds.overview}
            onToggle={toggleOverview}
            folded={
              <span className="block truncate text-[12px] text-(--text-muted)">
                {markdownSummaryLine(description)}
              </span>
            }
            actions={
              folds.overview && sectionKeys.length > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSections(allOpen ? [] : sectionKeys)}
                >
                  {allOpen
                    ? GROUP_STORY_PAGE_LABELS.collapseAll
                    : GROUP_STORY_PAGE_LABELS.expandAll}
                </Button>
              ) : null
            }
          >
            <div className="max-w-[76ch] text-[13px] text-(--text-secondary)">
              {doc.intro ? <Markdown text={doc.intro} /> : null}
              {doc.sections.length > 0 ? (
                <div className={`flex flex-col ${doc.intro ? 'mt-2' : ''}`}>
                  {doc.sections.map((section) => (
                    <FoldSection
                      key={section.key}
                      section={section}
                      openKeys={folds.sections}
                      onToggle={toggleSection}
                      nested={false}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </FoldPanel>
        ) : null}
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

/** A story page's panel that folds to its heading and one line saying what it holds. */
function FoldPanel({
  title,
  meta,
  open,
  onToggle,
  folded,
  actions,
  children,
}: {
  title: string
  meta?: string
  open: boolean
  onToggle: () => void
  /** The one line shown while folded. */
  folded: ReactNode
  actions?: ReactNode
  children: ReactNode
}) {
  const bodyId = useId()
  return (
    <section
      aria-label={title}
      className="rounded-lg border border-(--border-default) bg-(--surface-raised) px-3.5 py-2.5 @max-3xl:rounded-none @max-3xl:border-x-0 @max-3xl:border-t-0 @max-3xl:px-4"
    >
      <div className="flex items-center gap-2">
        <h2 className="m-0 min-w-0 flex-1">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={onToggle}
            className="flex min-h-9 w-full items-center gap-2 text-left @max-3xl:min-h-11"
          >
            <IconChevron
              className={`icon-chevron h-4 w-4 shrink-0 text-(--text-muted) ${open ? 'expanded' : ''}`}
            />
            <span className="text-[18px] font-semibold text-(--text-primary) @max-3xl:text-[15px]">
              {title}
            </span>
            {meta ? (
              <span className="truncate text-[12px] font-normal text-(--text-muted)">{meta}</span>
            ) : null}
          </button>
        </h2>
        {actions}
      </div>
      {open ? (
        <div id={bodyId} className="mt-1.5 pb-1">
          {children}
        </div>
      ) : (
        <div className="pb-1 pl-6">{folded}</div>
      )}
    </section>
  )
}

/** A folded description section — its heading and summary — opening to its text and subsections. */
function FoldSection({
  section,
  openKeys,
  onToggle,
  nested,
}: {
  section: MarkdownSection
  openKeys: readonly string[]
  onToggle: (key: string) => void
  nested: boolean
}) {
  const open = openKeys.includes(section.key)
  const Heading = nested ? 'h4' : 'h3'
  return (
    <div className={`border-t border-(--border-subtle) ${nested ? 'border-dashed' : ''}`}>
      <Heading className="m-0">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => onToggle(section.key)}
          className="flex min-h-11 w-full items-start gap-2 rounded-md px-1 py-2 text-left hover:bg-(--surface-hover)"
        >
          <IconChevron
            className={`icon-chevron mt-0.5 h-4 w-4 shrink-0 text-(--text-muted) ${open ? 'expanded' : ''}`}
          />
          <span className="flex min-w-0 flex-1 flex-col gap-px">
            <span
              className={`font-semibold text-(--text-primary) ${nested ? 'text-[13px]' : 'text-[14px]'}`}
            >
              {section.title}
            </span>
            {open ? null : (
              <span className="truncate text-[12px] font-normal text-(--text-muted)">
                {section.meta ? <span className="@3xl:hidden">{`${section.meta} · `}</span> : null}
                {section.summary}
              </span>
            )}
          </span>
          {section.meta ? (
            <span className="shrink-0 @max-3xl:hidden">
              <span className="chips-sub__label font-normal">{section.meta}</span>
            </span>
          ) : null}
        </button>
      </Heading>
      {open ? (
        <div className="pb-3 pl-7 pr-1 @max-3xl:pl-5 @max-3xl:pr-0">
          {section.body ? <Markdown text={section.body} /> : null}
          {section.subsections.map((sub) => (
            <FoldSection
              key={sub.key}
              section={sub}
              openKeys={openKeys}
              onToggle={onToggle}
              nested
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

/** The parts in the order they run, one line: a status dot and project each, → between steps. */
function PartsLine({
  columns,
  looping,
}: {
  columns: ReturnType<typeof groupStoryStepColumns>['columns']
  looping: GroupStoryPartView[]
}) {
  const dot = (part: GroupStoryPartView) => (
    <span
      key={part.projectId}
      className="inline-flex items-center gap-1.5 whitespace-nowrap"
      title={part.status ? statusLabel(part.status) : undefined}
    >
      <span
        className={`status-bullet status-bullet--${part.status ? statusKey(part.status) : 'empty'}`}
        aria-hidden
      />
      <span className="text-(--text-secondary)">{part.projectTitle}</span>
      {part.status ? <span className="sr-only">{statusLabel(part.status)}</span> : null}
    </span>
  )
  return (
    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px]">
      {columns.map((column, i) => (
        <Fragment key={column.step}>
          {i > 0 ? (
            <span aria-hidden className="text-(--text-muted)">
              →
            </span>
          ) : null}
          {column.parts.map(dot)}
        </Fragment>
      ))}
      {looping.length > 0 ? (
        <>
          <span className="text-(--status-stuck-soft-fg)">Cannot start:</span>
          {looping.map(dot)}
        </>
      ) : null}
    </span>
  )
}

function StepColumn({
  label,
  stuck = false,
  parts,
  story,
  onOpenPartStory,
}: {
  label: string
  stuck?: boolean
  parts: GroupStoryPartView[]
  story: GroupStoryView
  onOpenPartStory: (projectId: string, storyId: string) => void
}) {
  return (
    <section
      aria-label={label}
      className="flex min-w-0 flex-[1_1_14rem] flex-col gap-2 @3xl:max-w-80"
    >
      <h3
        className={`m-0 text-[10.5px] font-semibold uppercase tracking-wider ${stuck ? 'text-(--status-stuck-soft-fg)' : 'text-(--text-muted)'}`}
      >
        {label}
      </h3>
      {parts.map((part) => (
        <PartCard
          key={part.projectId}
          part={part}
          story={story}
          onOpenPartStory={onOpenPartStory}
        />
      ))}
    </section>
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
