import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import type { GitDiffSummary, GitFileChange, GitLogCommit } from '../../../headless/api'
import { EMPTY_TREE_SHA } from 'thefactory-tools/constants'
import Alert from '../../primitives/Alert'
import Spinner from '../../primitives/Spinner'
import { ResizeHandle } from '../ResizeHandle'
import { PathDisplay } from '../PathDisplay'
import { DiffViewer, type IntraMode } from '../diff'
import { GitFileChangesPills } from './common/GitFileChangesPills'
import GitFileStatusIcon from './common/GitFileStatusIcon'
import { getFilePatch } from 'thefactory-tools/utils'
import { useIsNarrowViewport } from '../../hooks/useIsNarrowViewport'
import { useLocalStorageNumber } from '../../hooks/useLocalStorage'

/**
 * Fetches the file-level diff between two refs. Caller-supplied so the
 * same viewer renders a project commit, an overseer commit, or any
 * future repo scope without baking the SDK path in here.
 */
export type CommitDiffFetcher = (
  input: { baseRef: string; headRef: string; includePatch: boolean },
  signal: AbortSignal,
) => Promise<GitDiffSummary>

export type CommitDiffViewerProps = {
  commitSha: string
  /**
   * Loaded log for parent-SHA lookup. The root commit has no parent — we
   * fall back to git's empty-tree SHA so the diff renders every file as
   * added rather than 500ing on a bad-ref `<sha>^`.
   */
  log: GitLogCommit[]
  fetcher: CommitDiffFetcher
  /**
   * Controlled narrow-detail state — pass to drive whether the small-
   * screen file-diff detail is open from outside. The host typically
   * does this so it can also wire a pushed-view / back-affordance
   * against the same state (the lifted component intentionally does
   * NOT integrate with any specific view-stack context). When
   * `undefined`, the component manages the state internally.
   */
  narrowDetailActive?: boolean
  /** Fires whenever the narrow-detail state flips. The host uses this
   *  to track the value (controlled or not) so it can give the diff the
   *  full screen by hiding sibling panels above, and to register a
   *  back-affordance with its own view-stack. */
  onNarrowDetailChange?: (active: boolean) => void
}

const LEFT_WIDTH_KEY = 'CommitDiffViewer.leftWidthPx'

/**
 * One row in the file list. Memoised so a selection change in a commit
 * with thousands of files only re-renders the two affected rows (newly-
 * selected and previously-selected) instead of the whole list. Custom
 * `arePropsEqual` makes the comparison cheap: stable identities on the
 * file object, the memoised patch reference, the stable click handler.
 */
type FileRowProps = {
  file: GitFileChange
  patch: string
  isSelected: boolean
  compact: boolean
  onSelect: (path: string) => void
}

const FileRow = memo(
  function FileRow({ file, patch, isSelected, compact, onSelect }: FileRowProps) {
    const onClick = () => onSelect(file.path)
    if (compact) {
      return (
        <button
          type="button"
          onClick={onClick}
          className="group flex w-full items-center gap-2 px-2 py-1 border-b border-(--border-subtle) text-xs text-left hover:bg-(--surface-muted)"
          title={file.path}
        >
          <GitFileStatusIcon status={file.status} className="w-4 h-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <PathDisplay path={file.path} />
          </div>
          <GitFileChangesPills patch={patch} />
        </button>
      )
    }
    return (
      <button
        type="button"
        onClick={onClick}
        className={`w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs ${
          isSelected
            ? 'bg-sky-50 dark:bg-sky-900/25 text-sky-900 dark:text-sky-100'
            : 'hover:bg-(--surface-muted)'
        }`}
        title={file.path}
      >
        <GitFileStatusIcon status={file.status} className="w-3.5 h-3.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate">
          <PathDisplay path={file.path} />
        </span>
        <GitFileChangesPills patch={patch} />
      </button>
    )
  },
  (a, b) =>
    a.file === b.file &&
    a.patch === b.patch &&
    a.isSelected === b.isSelected &&
    a.compact === b.compact &&
    a.onSelect === b.onSelect,
)

/**
 * Read-only diff for a single commit or stash — fetched via the supplied
 * `fetcher` (typically `getBranchDiffSummary({ baseRef: "<sha>^",
 * headRef: "<sha>" })` for a project; `getOverseerGitDiffSummary` for the
 * overseer). On wide viewports renders the desktop two-pane layout
 * (file list left, rich `DiffViewer` right). On narrow viewports
 * collapses to a master/detail stack: list of changed files matching
 * `LocalChangesPane`'s row style, tap pushes the file's diff full-screen.
 * The master row design uses the same status icon + `PathDisplay` + +/−
 * pills as the staged/unstaged rows so the two views read identically.
 *
 * Lifted from `thefactory-overseer-web`'s `src/ui/components/git/` so
 * both web and desktop import the same component. The view-stack /
 * back-button integration is delegated to the host via the
 * `onNarrowDetailChange` callback — the lifted component does not bind
 * to any specific app-shell context.
 */
export default function CommitDiffViewer({
  commitSha,
  log,
  fetcher,
  narrowDetailActive,
  onNarrowDetailChange,
}: CommitDiffViewerProps) {
  const [summary, setSummary] = useState<GitDiffSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)

  const isNarrow = useIsNarrowViewport()
  // Below `md` the two-pane layout collapses to master/detail (file list →
  // tap → diff). The open/closed state is controlled when the host passes
  // `narrowDetailActive` (web `GitView` owns it so it can also drive a
  // `usePushedView` back affordance) and internal otherwise (the overseer
  // view). A single `setNarrowFileDetail` is the only emit path: it updates
  // internal state when uncontrolled and always notifies the host. The raw
  // boolean is emitted — callers combine it with their own narrow check.
  const isControlled = narrowDetailActive !== undefined
  const [internalNarrowDetail, setInternalNarrowDetail] = useState(false)
  const narrowFileDetail = isControlled ? !!narrowDetailActive : internalNarrowDetail
  const setNarrowFileDetail = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalNarrowDetail(next)
      onNarrowDetailChange?.(next)
    },
    [isControlled, onNarrowDetailChange],
  )

  const [leftWidth, setLeftWidth] = useLocalStorageNumber(LEFT_WIDTH_KEY, 300)
  const onLeftResizeStart = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = leftWidth
    const onMove = (ev: globalThis.PointerEvent) => {
      const dx = ev.clientX - startX
      setLeftWidth(Math.max(150, Math.min(800, startW + dx)))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const [wrap, setWrap] = useState(false)
  const [ignoreWS, setIgnoreWS] = useState(false)
  const [intra, setIntra] = useState<IntraMode>('word')

  // The fetch effect aborts on commit-sha change so a quick click between
  // commits doesn't render a stale diff. Resolving `baseRef` is the
  // tricky bit:
  //   - For an ordinary commit we look up the entry in the supplied
  //     `log` and use its `parents[0]`. That works regardless of repo
  //     shape and also handles the **initial / root commit** (no parent)
  //     — we fall back to git's empty-tree SHA so the diff renders every
  //     file as added rather than 500ing on a bad-ref `<sha>^`.
  //   - For a stash ref (`stash@{0}`) the entry isn't in `log` — git
  //     resolves `<stashRef>^` to the working-tree parent itself, so the
  //     suffix form is correct here.
  const lastReqRef = useRef<AbortController | null>(null)
  useEffect(() => {
    if (!commitSha || commitSha === 'UNCOMMITTED') return
    lastReqRef.current?.abort()
    const controller = new AbortController()
    lastReqRef.current = controller
    setLoading(true)
    setError(null)
    setSummary(null)
    setSelectedPath(null)
    setNarrowFileDetail(false)
    const found = log.find((c) => c.hash === commitSha)
    const baseRef = found ? (found.parents?.[0] ?? EMPTY_TREE_SHA) : `${commitSha}^`
    fetcher({ baseRef, headRef: commitSha, includePatch: true }, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return
        setSummary(data)
        // On wide viewports auto-select the first file so the diff pane
        // isn't blank. On narrow we leave selection unset until the user
        // taps — otherwise we'd auto-push into a file detail on every
        // commit change.
        setSelectedPath((prev) => prev ?? (isNarrow ? null : (data.files[0]?.path ?? null)))
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : 'Failed to load commit diff')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [commitSha, isNarrow, log, fetcher, setNarrowFileDetail])

  // Memoise per-file patches once per loaded summary. `getFilePatch` scans
  // the entire combined `summary.patch` to find a file's section, so
  // calling it inline for every row turns into O(n · |patch|) work on
  // every render — devastating for commits with thousands of files when
  // a row click forces the list to re-render. The Map is computed once
  // and reused across renders + handed to memoised rows as a stable
  // string reference per path.
  const patchByPath = useMemo(() => {
    const m = new Map<string, string>()
    if (!summary) return m
    const combined = summary.patch ?? ''
    for (const f of summary.files) {
      m.set(f.path, f.patch || getFilePatch(combined, f.path) || '')
    }
    return m
  }, [summary])

  // Stable click handlers so memoised `FileRow`s never get a fresh
  // `onSelect` prop on parent re-renders.
  const onSelectFile = useCallback((path: string) => setSelectedPath(path), [])
  const onSelectFileNarrow = useCallback(
    (path: string) => {
      setSelectedPath(path)
      setNarrowFileDetail(true)
    },
    [setNarrowFileDetail],
  )

  if (commitSha === 'UNCOMMITTED') return null
  if (loading) {
    return (
      <div className="p-4 flex items-center gap-2 text-sm opacity-70">
        <Spinner /> Loading commit diff…
      </div>
    )
  }
  if (error) return <Alert>{error}</Alert>
  if (!summary) return null

  const activeFile = summary.files.find((f) => f.path === selectedPath) ?? null
  const filePatch = activeFile ? (patchByPath.get(activeFile.path) ?? '') : ''

  if (isNarrow) {
    if (narrowFileDetail && activeFile) {
      return (
        <div className="flex flex-col flex-1 min-h-0 bg-(--surface-base)">
          <DiffViewer
            path={activeFile.path}
            patch={filePatch}
            wrap={wrap}
            ignoreWS={ignoreWS}
            intra={intra}
            onWrapChange={setWrap}
            onIgnoreWSChange={setIgnoreWS}
            onIntraChange={setIntra}
          />
        </div>
      )
    }
    return (
      <div className="flex flex-col flex-1 min-h-0 bg-(--surface-base)">
        <div className="bg-(--surface-muted) px-3 py-2 border-b border-(--border-subtle) text-xs font-semibold text-(--text-secondary) uppercase tracking-wide flex justify-between items-center shrink-0">
          <span>Files ({summary.files.length})</span>
          <GitFileChangesPills additions={summary.insertions} deletions={summary.deletions} />
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          {summary.files.length === 0 ? (
            <div className="px-3 py-2 text-xs text-(--text-muted) italic">
              No file changes in this commit.
            </div>
          ) : (
            summary.files.map((file) => (
              <FileRow
                key={file.path}
                file={file}
                patch={patchByPath.get(file.path) ?? ''}
                isSelected={false}
                compact
                onSelect={onSelectFileNarrow}
              />
            ))
          )}
        </div>
      </div>
    )
  }

  const desktopActiveFile = activeFile ?? summary.files[0]
  const desktopPatch = desktopActiveFile ? (patchByPath.get(desktopActiveFile.path) ?? '') : ''
  return (
    <div className="flex flex-row min-h-0 h-full bg-(--surface-base)">
      <div
        className="shrink-0 flex flex-col border-r border-(--border-subtle) overflow-hidden"
        style={{ width: leftWidth }}
      >
        <div className="bg-(--surface-muted) px-3 py-2 border-b border-(--border-subtle) text-xs font-semibold text-(--text-secondary) uppercase tracking-wide flex justify-between items-center shrink-0">
          <span>Files ({summary.files.length})</span>
          <GitFileChangesPills additions={summary.insertions} deletions={summary.deletions} />
        </div>
        <div className="flex-1 min-h-0 overflow-auto divide-y divide-(--border-subtle)">
          {summary.files.length === 0 ? (
            <div className="px-3 py-2 text-xs text-(--text-muted) italic">
              No file changes in this commit.
            </div>
          ) : (
            summary.files.map((file) => (
              <FileRow
                key={file.path}
                file={file}
                patch={patchByPath.get(file.path) ?? ''}
                isSelected={file.path === desktopActiveFile?.path}
                compact={false}
                onSelect={onSelectFile}
              />
            ))
          )}
        </div>
      </div>

      <ResizeHandle orientation="vertical" onResizeStart={onLeftResizeStart} />

      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        {desktopActiveFile ? (
          <DiffViewer
            path={desktopActiveFile.path}
            patch={desktopPatch}
            wrap={wrap}
            ignoreWS={ignoreWS}
            intra={intra}
            onWrapChange={setWrap}
            onIgnoreWSChange={setIgnoreWS}
            onIntraChange={setIntra}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-(--text-muted)">
            Select a file to see its diff.
          </div>
        )}
      </div>
    </div>
  )
}
