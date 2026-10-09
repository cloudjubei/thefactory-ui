import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { ResourceLink } from 'thefactory-tools/types'
import {
  PROJECT_SEARCH_QUERY_PARAM,
  PROJECT_SEARCH_TEXT,
  fileLocationPath,
  projectSearchSummary,
  searchMatchSegments,
  searchRecordChip,
  stepSearchCursor,
  useProjectSearch,
  useReferences,
  type ProjectSearchFileRow,
  type ProjectSearchRecordRow,
  type ProjectSearchTarget,
} from '../../../headless'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import Spinner from '../../primitives/Spinner'
import { IconClose, IconSearch } from '../../icons'
import ReferenceChip from '../chips/ReferenceChip'
import StatusControl from '../StatusControl'
import { FileTypeIcon } from '../files/FileTypeIcon'
import { PathDisplay } from '../PathDisplay'

export type ProjectSearchViewProps = {
  projectId: string | undefined
  /** Opens a story, feature or note a result names. */
  onOpenResource: (link: ResourceLink) => void
}

/**
 * A project's Search tab: one box that finds its files (with the lines that
 * matched), stories, features and notes, listed under a heading per kind with
 * its count. Arrow keys move through the results, Enter opens one, Escape
 * clears the box; the query lives in `?q=` so Back returns to it.
 */
export default function ProjectSearchView({ projectId, onOpenResource }: ProjectSearchViewProps) {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const search = useProjectSearch(projectId, params.get(PROJECT_SEARCH_QUERY_PARAM) ?? '')
  const { describeLink } = useReferences({ scope: projectId ? { projectId } : undefined })
  const [cursor, setCursor] = useState(-1)
  const listId = useId()
  const rowRefs = useRef(new Map<string, HTMLDivElement>())
  const { rows, groups, status, searched, query } = search

  useEffect(() => {
    setCursor(-1)
  }, [rows])
  const movedByKey = useRef(false)
  useEffect(() => {
    const key = rows[cursor]?.key
    if (!key || !movedByKey.current) return
    movedByKey.current = false
    rowRefs.current.get(key)?.scrollIntoView({ block: 'nearest' })
  }, [cursor, rows])

  const typed = query.trim()
  useEffect(() => {
    const kept = !typed ? '' : status === 'done' || status === 'error' ? searched : undefined
    if (kept === undefined || (params.get(PROJECT_SEARCH_QUERY_PARAM) ?? '') === kept) return
    const next = new URLSearchParams(params)
    if (kept) next.set(PROJECT_SEARCH_QUERY_PARAM, kept)
    else next.delete(PROJECT_SEARCH_QUERY_PARAM)
    setParams(next, { replace: true })
  }, [typed, status, searched, params, setParams])

  const open = (target: ProjectSearchTarget) => {
    if (target.type === 'resource') onOpenResource(target.link)
    else if (projectId) navigate(fileLocationPath(projectId, target.path, target.line))
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      movedByKey.current = true
      setCursor((c) => stepSearchCursor(c, rows.length, e.key === 'ArrowDown' ? 1 : -1))
    } else if (e.key === 'Enter') {
      const row = rows[cursor] ?? rows[0]
      if (row) {
        e.preventDefault()
        open(row.target)
      }
    } else if (e.key === 'Escape' && query) {
      e.preventDefault()
      search.setQuery('')
    }
  }

  const showResults = (status === 'done' || status === 'searching') && rows.length > 0
  const activeKey = rows[cursor]?.key

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-(--border-subtle) p-4">
        <div className="relative mx-auto max-w-4xl">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--text-muted)" />
          <Input
            autoFocus
            size="lg"
            type="search"
            role="combobox"
            aria-label={PROJECT_SEARCH_TEXT.title}
            aria-expanded={showResults}
            aria-controls={listId}
            aria-autocomplete="list"
            {...(activeKey ? { 'aria-activedescendant': rowId(listId, activeKey) } : {})}
            placeholder={PROJECT_SEARCH_TEXT.placeholder}
            value={query}
            disabled={!projectId}
            onChange={(e) => search.setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            className="pl-9 pr-10 [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button
              type="button"
              aria-label={PROJECT_SEARCH_TEXT.clear}
              title={PROJECT_SEARCH_TEXT.clear}
              onClick={() => search.setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-(--text-muted) hover:bg-(--surface-muted) hover:text-(--text-primary)"
            >
              <IconClose className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <div className="mx-auto mt-2 flex min-h-5 max-w-4xl items-center gap-2 text-[12px] text-(--text-secondary)">
          {status === 'searching' ? (
            <Spinner size={12} label={PROJECT_SEARCH_TEXT.searching} />
          ) : null}
          {status === 'done' && rows.length > 0 ? (
            <span>{projectSearchSummary(groups, searched)}</span>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-4xl p-4">
          {!projectId ? (
            <Hint>{PROJECT_SEARCH_TEXT.noProject}</Hint>
          ) : status === 'idle' ? (
            <Hint>{PROJECT_SEARCH_TEXT.idle}</Hint>
          ) : status === 'short' ? (
            <Hint>{PROJECT_SEARCH_TEXT.short}</Hint>
          ) : status === 'error' ? (
            <Alert>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>{search.error}</span>
                <Button size="sm" variant="secondary" onClick={search.retry}>
                  {PROJECT_SEARCH_TEXT.retry}
                </Button>
              </div>
            </Alert>
          ) : null}

          {showResults ? (
            <div
              id={listId}
              role="listbox"
              aria-label={PROJECT_SEARCH_TEXT.title}
              className={`flex flex-col gap-5 ${status === 'searching' ? 'opacity-60' : ''}`}
            >
              {groups.map((group) => (
                <section key={group.key} role="group" aria-label={group.label}>
                  <h3 className="mb-1.5 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-(--text-muted)">
                    {group.label}
                    <span className="rounded-full bg-(--surface-muted) px-1.5 py-px text-[11px] font-medium normal-case tracking-normal text-(--text-secondary)">
                      {group.rows.length}
                    </span>
                  </h3>
                  <div className="divide-y divide-(--border-subtle) overflow-hidden rounded-md border border-(--border-subtle)">
                    {group.rows.map((row) => (
                      <div
                        key={row.key}
                        id={rowId(listId, row.key)}
                        role="option"
                        aria-selected={row.key === activeKey}
                        ref={(el) => {
                          if (el) rowRefs.current.set(row.key, el)
                          else rowRefs.current.delete(row.key)
                        }}
                        onMouseMove={() => {
                          const at = rows.indexOf(row)
                          if (at !== cursor) setCursor(at)
                        }}
                        onClick={() => open(row.target)}
                        className={`cursor-pointer px-3 py-2 ${
                          row.key === activeKey ? 'bg-(--surface-muted)' : 'bg-(--surface-raised)'
                        }`}
                      >
                        {row.kind === 'file' ? (
                          <FileRow row={row} query={searched} />
                        ) : (
                          <RecordRow
                            row={row}
                            query={searched}
                            chip={searchRecordChip(row, describeLink(row.link))}
                            onOpen={onOpenResource}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : status === 'done' ? (
            <Hint>{projectSearchSummary(groups, searched)}</Hint>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function rowId(listId: string, key: string): string {
  return `${listId}-${encodeURIComponent(key)}`
}

function Hint({ children }: { children: string }) {
  return <p className="py-8 text-center text-sm text-(--text-secondary)">{children}</p>
}

function Highlighted({ text, query }: { text: string; query: string }) {
  return (
    <>
      {searchMatchSegments(text, query).map((s, i) =>
        s.match ? (
          <mark key={i} className="rounded-sm bg-amber-400/35 text-inherit">
            {s.text}
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  )
}

function FileRow({ row, query }: { row: ProjectSearchFileRow; query: string }) {
  const name = row.path.split('/').pop() ?? row.path
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex min-w-0 items-center gap-2">
        <FileTypeIcon name={name} size={16} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <PathDisplay path={row.path} />
        </div>
        {row.lines ? (
          <span className="shrink-0 text-[11px] text-(--text-muted)">{row.lines}</span>
        ) : null}
      </div>
      {row.snippet ? (
        <pre className="overflow-hidden rounded bg-(--surface-muted) px-2 py-1 font-mono text-[11.5px] leading-5 text-(--text-secondary)">
          {row.snippet.text.split('\n').map((line, i) => (
            <div key={i} className="flex min-w-0 gap-3">
              <span className="w-8 shrink-0 select-none text-right text-(--text-muted)">
                {(row.snippet?.line ?? 0) + i}
              </span>
              <span className="min-w-0 truncate">
                <Highlighted text={line} query={query} />
              </span>
            </div>
          ))}
        </pre>
      ) : null}
    </div>
  )
}

function RecordRow({
  row,
  query,
  chip,
  onOpen,
}: {
  row: ProjectSearchRecordRow
  query: string
  chip: ReturnType<typeof searchRecordChip>
  onOpen: (link: ResourceLink) => void
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0">
          <ReferenceChip description={chip.description} onOpen={onOpen} />
        </span>
        {chip.title ? (
          <span className="min-w-0 truncate text-sm font-medium text-(--text-primary)">
            <Highlighted text={chip.title} query={query} />
          </span>
        ) : null}
        {row.status ? (
          <span className="ml-auto shrink-0">
            <StatusControl status={row.status} />
          </span>
        ) : null}
      </div>
      {row.excerpt ? (
        <p className="line-clamp-2 text-[12.5px] text-(--text-secondary)">
          <Highlighted text={row.excerpt} query={query} />
        </p>
      ) : null}
    </div>
  )
}
