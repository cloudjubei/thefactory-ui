import { useEffect, useState, type ReactNode } from 'react'
import {
  StructuredUnifiedDiff,
  type IntraMode,
  parseUnifiedDiff,
  generateSelectedPatch,
  generateHunkPatch,
} from './diffUtils'
import { PathDisplay } from '../PathDisplay'
import { IconWarningTriangle } from '../../icons'

export type { IntraMode } from './diffUtils'

export interface DiffViewerProps {
  path?: string
  patch?: string
  wrap: boolean
  ignoreWS: boolean
  intra: IntraMode
  onWrapChange: (val: boolean) => void
  onIgnoreWSChange: (val: boolean) => void
  onIntraChange: (val: IntraMode) => void
  /** Apply a partial/full patch. `reverse=true` means unstage/discard. */
  onApplyPatch?: (patch: string, reverse: boolean) => void
  /** Discard (reset) a patch chunk — no staging, just discard. */
  onDiscardPatch?: (patch: string) => void
  isStaged?: boolean
  /** When true the file has unresolved merge-conflict markers. */
  isConflicted?: boolean
  /** Opens the merge-conflict resolver for this file. */
  onResolveConflict?: () => void
  /**
   * Caller-rendered file-changes summary (e.g. `+12 -4` pills). Library doesn't
   * know about git statuses; the consumer renders whatever pill/badge fits.
   * Desktop's `GitFileChangesPills` slots in here directly.
   */
  stats?: ReactNode
}

// Single-file diff widget with selectable hunks, intra-line modes, and
// partial-apply controls. Decoupled from the host's git domain — caller wires
// `onApplyPatch` / `onDiscardPatch` and supplies the stats slot.
export function DiffViewer({
  path,
  patch,
  wrap,
  ignoreWS,
  intra,
  onWrapChange,
  onIgnoreWSChange,
  onIntraChange,
  onApplyPatch,
  onDiscardPatch,
  isStaged,
  isConflicted,
  onResolveConflict,
  stats,
}: DiffViewerProps) {
  const isEditable = !!onApplyPatch

  const [selectable, setSelectable] = useState(false)
  const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set())

  useEffect(() => {
    setSelectedLines(new Set())
    setSelectable(false)
  }, [patch, path])

  const toggleLineSelection = (hunkIndex: number, lineIndex: number) => {
    setSelectedLines((prev) => {
      const next = new Set(prev)
      const key = `${hunkIndex}:${lineIndex}`
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleHunkSelection = (hunkIndex: number) => {
    if (!patch) return
    const hunks = parseUnifiedDiff(patch)
    const hunk = hunks[hunkIndex]
    if (!hunk) return
    setSelectedLines((prev) => {
      const next = new Set(prev)
      const modLines = hunk.lines
        .map((l, idx) => ({ l, idx }))
        .filter(({ l }) => l.type === 'add' || l.type === 'del')
      const isAllSelected = modLines.every(({ idx }) => next.has(`${hunkIndex}:${idx}`))
      modLines.forEach(({ idx }) => {
        const key = `${hunkIndex}:${idx}`
        if (isAllSelected) next.delete(key)
        else next.add(key)
      })
      return next
    })
  }

  const handleApplySelection = () => {
    if (!patch || !onApplyPatch) return
    onApplyPatch(generateSelectedPatch(patch, selectedLines), !!isStaged)
    setSelectable(false)
    setSelectedLines(new Set())
  }

  const handleDiscardSelection = () => {
    if (!patch || !onDiscardPatch) return
    onDiscardPatch(generateSelectedPatch(patch, selectedLines))
    setSelectable(false)
    setSelectedLines(new Set())
  }

  const handleStageHunk = (hunkIndex: number) => {
    if (!patch || !onApplyPatch) return
    onApplyPatch(generateHunkPatch(patch, hunkIndex), false)
  }

  const handleUnstageHunk = (hunkIndex: number) => {
    if (!patch || !onApplyPatch) return
    onApplyPatch(generateHunkPatch(patch, hunkIndex), true)
  }

  const handleDiscardHunk = (hunkIndex: number) => {
    if (!patch || !onDiscardPatch) return
    onDiscardPatch(generateHunkPatch(patch, hunkIndex))
  }

  const hasSelection = selectedLines.size > 0

  return (
    <div className="flex-1 min-w-0 flex flex-col min-h-0 bg-(--surface-raised) w-full h-full">
      {/* Toolbar */}
      <div className="text-xs border-b flex flex-col w-full shrink-0 bg-(--surface-muted) text-(--text-secondary) border-(--border-subtle)">
        {/* Row 1 — file name + stats */}
        <div className="px-2 py-2 flex items-center justify-between min-w-0">
          {path ? (
            <>
              <div className="flex-1 min-w-0 mr-4 font-semibold flex items-center gap-2 text-(--text-primary)">
                {isConflicted && (
                  <IconWarningTriangle className="w-3.5 h-3.5 text-(--color-red-600) flex-none" />
                )}
                <PathDisplay path={path} />
              </div>
              {stats && <div className="shrink-0 flex items-center">{stats}</div>}
            </>
          ) : (
            <span className="opacity-70">No file selected</span>
          )}
        </div>

        {/* Row 2 — view options */}
        {path && (
          <div className="px-2 pb-2 flex items-center gap-3 shrink-0 font-normal border-t pt-1.5 border-(--border-subtle)">
            <label className="inline-flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={wrap}
                onChange={(e) => onWrapChange(e.target.checked)}
              />
              <span>Wrap</span>
            </label>
            <label className="inline-flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={ignoreWS}
                onChange={(e) => onIgnoreWSChange(e.target.checked)}
              />
              <span>Ignore WS</span>
            </label>
            <label className="inline-flex items-center gap-1 cursor-pointer">
              <span>Intra</span>
              <select
                className="border bg-transparent rounded px-1 py-0.5 border-(--border-subtle)"
                value={intra}
                onChange={(e) => onIntraChange(e.target.value as IntraMode)}
              >
                <option value="none">none</option>
                <option value="word">word</option>
                <option value="char">char</option>
              </select>
            </label>
          </div>
        )}

        {/* Row 3 — selection actions + Resolve Conflicts + Select Lines (only in edit mode) */}
        {path && isEditable && (
          <div className="px-2 border-t flex items-center gap-2 h-[50px] border-(--border-subtle)">
            <div className="flex items-center gap-2 flex-1">
              {selectable && (
                <>
                  <button
                    onClick={handleApplySelection}
                    disabled={!hasSelection}
                    className={`px-3 py-1 rounded text-[11px] font-medium transition-colors ${
                      hasSelection
                        ? 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white'
                        : 'bg-(--surface-raised) border border-(--border-default) text-(--text-muted) opacity-60 cursor-not-allowed'
                    }`}
                  >
                    {isStaged ? 'Unstage Selected' : 'Stage Selected'}
                  </button>
                  <button
                    onClick={handleDiscardSelection}
                    disabled={!hasSelection}
                    className={`px-3 py-1 rounded text-[11px] font-medium transition-colors ${
                      hasSelection
                        ? 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white'
                        : 'bg-(--surface-raised) border border-(--border-default) text-(--text-muted) opacity-60 cursor-not-allowed'
                    }`}
                  >
                    Discard Selected
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isConflicted && onResolveConflict && (
                <button
                  onClick={onResolveConflict}
                  className="px-3 py-1 rounded text-[11px] font-medium border transition-colors bg-red-600 hover:bg-red-700 active:bg-red-800 text-white border-red-700 flex items-center gap-1.5"
                >
                  <IconWarningTriangle className="w-3.5 h-3.5" />
                  Resolve Conflicts
                </button>
              )}
              <button
                className={`px-3 py-1 rounded text-[11px] font-medium border transition-colors ${
                  selectable
                    ? 'bg-(--surface-raised) border-(--border-strong) text-(--text-primary) hover:bg-(--surface-muted)'
                    : 'bg-(--surface-raised) hover:bg-(--surface-hover) border-(--border-default) text-(--text-secondary)'
                }`}
                onClick={() =>
                  setSelectable((s) => {
                    if (s) setSelectedLines(new Set())
                    return !s
                  })
                }
              >
                {selectable ? 'Exit Selection' : 'Select Lines'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Diff area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 w-full">
        {path ? (
          patch ? (
            <StructuredUnifiedDiff
              patch={patch}
              wrap={wrap}
              ignoreWhitespace={ignoreWS}
              intraline={intra}
              selectable={selectable}
              selectedLines={selectedLines}
              onToggleLineSelection={toggleLineSelection}
              onToggleHunkSelection={toggleHunkSelection}
              isStaged={isStaged}
              isEditable={isEditable}
              onStageHunk={handleStageHunk}
              onUnstageHunk={handleUnstageHunk}
              onDiscardHunk={handleDiscardHunk}
            />
          ) : (
            <div className="text-xs text-(--text-muted) flex items-center justify-center h-full p-4">
              No patch available for {path} (possibly binary or identical).
            </div>
          )
        ) : (
          <div className="text-xs text-(--text-muted) flex items-center justify-center h-full p-4">
            Select a file to view its diff.
          </div>
        )}
      </div>
    </div>
  )
}
