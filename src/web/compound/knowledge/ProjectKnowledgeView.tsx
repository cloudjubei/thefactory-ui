import { Fragment, type ReactNode } from 'react'
import {
  KNOWLEDGE_DEFAULT_LOOK,
  KNOWLEDGE_TEXT,
  knowledgeTextParts,
  type KnowledgeClaimRow,
  type KnowledgeLook,
  type KnowledgeModelMark,
  type KnowledgeNote,
  type KnowledgePlannedRow,
  type KnowledgeSectionView,
  type KnowledgeSource,
  type KnowledgeView,
  type KnowledgeWorkRow,
} from '../../../headless'
import { Button } from '../../primitives/Button'
import Spinner from '../../primitives/Spinner'
import ReferenceChip from '../chips/ReferenceChip'
import ToneBadge from '../chips/ToneBadge'
import StatusControl from '../StatusControl'

export type ProjectKnowledgeViewProps = {
  view: KnowledgeView
  /** The project the files belong to, for their chips. */
  projectId: string
  /** Opens a file at its line, as the Files tab does. Omitted, files show as text. */
  onOpenFile?: (path: string, line?: number) => void
  /** The story or feature chip for a recorded piece of work — the app's dependency chip. */
  renderWork: (row: KnowledgeWorkRow) => ReactNode
  onRetry?: () => void
  /** How the tab draws its open choices; the shipped look when omitted. */
  look?: KnowledgeLook
  className?: string
}

function ModelMark({ mark, look }: { mark: KnowledgeModelMark; look: KnowledgeLook['modelMark'] }) {
  if (look === 'caption') {
    return (
      <span className="text-[11px] italic text-(--text-muted)" title={mark.title}>
        {KNOWLEDGE_TEXT.modelCaption(mark.when)}
      </span>
    )
  }
  if (look === 'rail') {
    return (
      <span className="text-[11px] font-medium text-(--accent-soft-fg)" title={mark.title}>
        {mark.label}
      </span>
    )
  }
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-(--accent-soft-border) bg-(--accent-soft-bg) px-2 py-px text-[11px] text-(--accent-soft-fg)"
      title={mark.title}
      aria-label={mark.title}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${mark.stale ? 'bg-(--status-working-soft-fg)' : 'bg-(--accent-primary)'}`}
      />
      {mark.label}
    </span>
  )
}

function FileChip({
  source,
  projectId,
  onOpenFile,
}: {
  source: KnowledgeSource
  projectId: string
  onOpenFile: ((path: string, line?: number) => void) | undefined
}) {
  return (
    <ReferenceChip
      description={{
        kind: 'file',
        label: source.label,
        ...(source.name !== undefined ? { title: source.name } : {}),
        detail: source.line !== undefined ? `${source.path}:${source.line}` : source.path,
        link: { kind: 'file', projectId, path: source.path },
      }}
      {...(onOpenFile ? { onOpen: () => onOpenFile(source.path, source.line) } : {})}
    />
  )
}

function Inline({ text }: { text: string }) {
  return (
    <>
      {knowledgeTextParts(text).map((part, i) =>
        part.code ? (
          <code key={i} className="rounded bg-(--surface-muted) px-1 font-mono text-[0.9em]">
            {part.text}
          </code>
        ) : (
          <Fragment key={i}>{part.text}</Fragment>
        ),
      )}
    </>
  )
}

function Note({ note }: { note: KnowledgeNote }) {
  return (
    <p
      className={
        note.quiet ? 'text-sm italic text-(--text-muted)' : 'text-sm text-(--text-secondary)'
      }
    >
      {note.text}
    </p>
  )
}

function More({ text }: { text: string }) {
  return <p className="text-xs text-(--text-muted)">{text}</p>
}

type RowProps = {
  row: KnowledgeClaimRow
  look: KnowledgeLook
  projectId: string
  onOpenFile: ((path: string, line?: number) => void) | undefined
  card?: boolean
}

function ClaimRow({ row, look, projectId, onOpenFile, card }: RowProps) {
  const rail = row.model && look.modelMark === 'rail'
  const mark = row.model ? <ModelMark mark={row.model} look={look.modelMark} /> : null
  const frame = card
    ? 'rounded-lg border border-(--border-subtle) bg-(--surface-raised) p-3'
    : 'py-2.5'
  return (
    <li
      className={`flex min-w-0 flex-col gap-1.5 ${frame} ${rail ? `border-l-2 pl-3 ${row.model?.stale ? 'border-l-(--status-working-soft-fg)' : 'border-l-(--accent-primary)'}` : ''}`}
    >
      {row.name !== undefined || (mark && look.modelMark !== 'caption') ? (
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          {row.name !== undefined ? (
            <span className="min-w-0 break-words text-sm font-medium text-(--text-primary)">
              {row.name}
            </span>
          ) : null}
          {look.modelMark !== 'caption' ? mark : null}
        </div>
      ) : null}
      <p
        className={`break-words text-sm ${row.quiet ? 'italic text-(--text-muted)' : 'text-(--text-secondary)'}`}
      >
        <Inline text={row.text} />
        {look.modelMark === 'caption' && mark ? <> {mark}</> : null}
      </p>
      {row.sources.length > 0 ? (
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {row.sources.map((source) => (
            <FileChip
              key={`${source.path}:${source.line ?? ''}`}
              source={source}
              projectId={projectId}
              onOpenFile={onOpenFile}
            />
          ))}
        </div>
      ) : null}
    </li>
  )
}

function WorkLine({
  row,
  renderWork,
  nested,
}: {
  row: KnowledgeWorkRow
  renderWork: (row: KnowledgeWorkRow) => ReactNode
  nested?: boolean
}) {
  return (
    <div className={`flex min-h-[26px] min-w-0 items-center gap-2 ${nested ? 'pl-6' : ''}`}>
      {renderWork(row)}
      <span
        className={`min-w-0 flex-1 break-words text-(--text-primary) ${nested ? 'text-[12.5px]' : 'text-sm font-medium'}`}
      >
        <Inline text={row.title} />
      </span>
      <StatusControl status={row.status} className="shrink-0" />
    </div>
  )
}

function PlannedLine({
  item,
  projectId,
  onOpenFile,
}: {
  item: KnowledgePlannedRow
  projectId: string
  onOpenFile: ((path: string, line?: number) => void) | undefined
}) {
  const { source } = item
  return (
    <li
      className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 py-1"
      style={{ paddingLeft: `${item.depth * 20}px` }}
    >
      <span className="min-w-0 break-words text-sm text-(--text-primary)">
        <Inline text={item.text} />
      </span>
      {source?.path !== undefined ? (
        <FileChip source={source} projectId={projectId} onOpenFile={onOpenFile} />
      ) : source ? (
        <span className="text-xs text-(--text-muted)">{source.label}</span>
      ) : null}
    </li>
  )
}

function SectionBody({
  section,
  look,
  projectId,
  onOpenFile,
  renderWork,
}: {
  section: KnowledgeSectionView
  look: KnowledgeLook
  projectId: string
  onOpenFile: ((path: string, line?: number) => void) | undefined
  renderWork: (row: KnowledgeWorkRow) => ReactNode
}) {
  if (section.kind === 'claims') {
    if (section.rows.length === 0) return null
    const cards = section.id === 'capabilities' && look.capabilities === 'cards'
    return (
      <ul
        className={
          cards
            ? 'grid grid-cols-1 gap-2 md:grid-cols-2'
            : 'flex flex-col divide-y divide-(--border-subtle)'
        }
      >
        {section.rows.map((row) => (
          <ClaimRow
            key={row.key}
            row={row}
            look={look}
            projectId={projectId}
            onOpenFile={onOpenFile}
            card={cards}
          />
        ))}
      </ul>
    )
  }
  if (section.kind === 'work') {
    if (section.stories.length === 0) return null
    return (
      <ul className="flex flex-col gap-1.5">
        {section.stories.map((story) => (
          <li key={story.key} className="flex min-w-0 flex-col gap-1">
            <WorkLine row={story} renderWork={renderWork} />
            {story.features.map((feature) => (
              <WorkLine key={feature.key} row={feature} renderWork={renderWork} nested />
            ))}
            {story.more ? <p className="pl-6 text-xs text-(--text-muted)">{story.more}</p> : null}
          </li>
        ))}
      </ul>
    )
  }
  if (section.items.length === 0) return null
  return (
    <ul className="flex flex-col">
      {section.items.map((item) => (
        <PlannedLine key={item.key} item={item} projectId={projectId} onOpenFile={onOpenFile} />
      ))}
    </ul>
  )
}

function Section(props: {
  section: KnowledgeSectionView
  look: KnowledgeLook
  projectId: string
  onOpenFile: ((path: string, line?: number) => void) | undefined
  renderWork: (row: KnowledgeWorkRow) => ReactNode
}) {
  const { section } = props
  return (
    <section className="flex min-w-0 flex-col gap-2" aria-label={section.title}>
      <header className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="text-base font-semibold text-(--text-primary)">{section.title}</h2>
        <span className="text-xs text-(--text-muted)" title={section.refreshedAt}>
          {section.refreshed}
        </span>
        {section.stale ? (
          <ToneBadge tone="working" title={KNOWLEDGE_TEXT.staleTitle}>
            {KNOWLEDGE_TEXT.stale}
          </ToneBadge>
        ) : null}
      </header>
      {section.note ? <Note note={section.note} /> : null}
      <SectionBody {...props} />
      {section.more ? <More text={section.more} /> : null}
    </section>
  )
}

function Frame({ children, className }: { children: ReactNode; className: string }) {
  return (
    <div className={`h-full min-h-0 overflow-auto bg-(--surface-default) ${className}`}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-7 px-4 py-5 md:px-8 md:py-8">
        {children}
      </div>
    </div>
  )
}

function Placeholder({
  title,
  body,
  percent,
  busy,
  action,
}: {
  title: string
  body?: string
  percent?: number
  busy?: boolean
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-lg border border-(--border-subtle) bg-(--surface-raised) p-5">
      <div className="flex items-center gap-2">
        {busy ? <Spinner size={14} className="text-(--text-muted)" /> : null}
        <h2 className="text-base font-semibold text-(--text-primary)">{title}</h2>
      </div>
      {body ? <p className="text-sm text-(--text-secondary)">{body}</p> : null}
      {percent !== undefined ? (
        <div
          className="h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-(--border-subtle)"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full bg-(--accent-primary)" style={{ width: `${percent}%` }} />
        </div>
      ) : null}
      {action}
    </div>
  )
}

/**
 * A project's Knowledge tab: what its overview says — purpose, capabilities, main modules, recorded work and work
 * planned in its documents — each part with when it was written and whether it is out of date, model-written
 * entries marked apart from those read from the code, and the files an entry is read from opened where they are.
 * Without an overview, why there is none: the map still building, no checkout here, or a failed read.
 */
export default function ProjectKnowledgeView({
  view,
  projectId,
  onOpenFile,
  renderWork,
  onRetry,
  look = KNOWLEDGE_DEFAULT_LOOK,
  className = '',
}: ProjectKnowledgeViewProps) {
  if (view.kind === 'loading') {
    return (
      <Frame className={className}>
        <Placeholder title={view.title} busy />
      </Frame>
    )
  }
  if (view.kind === 'error') {
    return (
      <Frame className={className}>
        <Placeholder
          title={view.title}
          body={view.message}
          action={
            onRetry ? (
              <Button variant="outline" size="sm" onClick={onRetry}>
                {view.retry}
              </Button>
            ) : null
          }
        />
      </Frame>
    )
  }
  if (view.kind === 'empty') {
    return (
      <Frame className={className}>
        <Placeholder
          title={view.title}
          body={view.body}
          {...(view.percent !== undefined ? { percent: view.percent } : {})}
          busy={view.reason === 'building' || view.reason === 'queued'}
        />
      </Frame>
    )
  }
  return (
    <Frame className={className}>
      {view.updating ? (
        <p className="flex items-center gap-2 text-xs text-(--text-muted)">
          <Spinner size={12} />
          {view.updating}
        </p>
      ) : null}
      {view.sections.map((section) => (
        <Section
          key={section.id}
          section={section}
          look={look}
          projectId={projectId}
          onOpenFile={onOpenFile}
          renderWork={renderWork}
        />
      ))}
    </Frame>
  )
}
