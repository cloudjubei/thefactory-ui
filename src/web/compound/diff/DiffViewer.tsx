import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  StructuredUnifiedDiff,
  type IntraMode,
  parseUnifiedDiff,
  annotateHunks,
  generateSelectedPatch,
  generateHunkPatch,
  selectionKeysForLineRange,
} from './diffUtils'
import { OptionPicker } from '../OptionPicker'
import { PathDisplay } from '../PathDisplay'
import { IconChevron, IconWarningTriangle } from '../../icons'

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
   * Line-selection UX. `'checkbox'` (default) keeps the touch-friendly
   * Select-Lines toggle + per-line checkboxes (web small-screen + mobile).
   * `'drag'` selects whole line rows by pointer drag with the hunk buttons
   * morphing to "Stage/Discard/Unstage Lines" (web big-screen + desktop).
   */
  selectionMode?: 'drag' | 'checkbox'
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
  selectionMode = 'checkbox',
  stats,
}: DiffViewerProps) {
  const isEditable = !!onApplyPatch
  const dragMode = selectionMode === 'drag'

  const [selectable, setSelectable] = useState(false)
  const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set())

  // Drag mode (pointer): a contiguous row selection within a single hunk.
  // `anchor` is where the drag started; `focus` follows the pointer.
  const [drag, setDrag] = useState<{ hunkIndex: number; anchor: number; focus: number } | null>(
    null,
  )
  const draggingRef = useRef(false)

  useEffect(() => {
    setSelectedLines(new Set())
    setSelectable(false)
    setDrag(null)
    // A patch swap mid-drag must not leave the drag "armed" — otherwise a bare
    // hover over the new file's rows would keep extending a phantom selection.
    draggingRef.current = false
  }, [patch, path])

  // End-of-drag is owned by a single component-lifetime listener so it can't
  // leak on unmount and always fires — including `pointercancel` (touch/stylus
  // interruption) and a pointer released outside the window, both of which a
  // per-row `pointerup` would miss.
  useEffect(() => {
    const stop = () => {
      draggingRef.current = false
    }
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    return () => {
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
  }, [])

  const lineSelection = drag
    ? {
        hunkIndex: drag.hunkIndex,
        start: Math.min(drag.anchor, drag.focus),
        end: Math.max(drag.anchor, drag.focus),
      }
    : null

  const onLinePointerDown = (hunkIndex: number, lineIndex: number) => {
    draggingRef.current = true
    setDrag({ hunkIndex, anchor: lineIndex, focus: lineIndex })
  }

  // Extend the selection while dragging — but only within the hunk the drag
  // started in, so a selection is always contiguous (no cross-hunk gaps that
  // would make a partial patch ambiguous). `buttons === 0` means the press was
  // released without us seeing the pointerup (e.g. off-window): disarm so a
  // subsequent bare hover doesn't keep extending.
  const onLinePointerEnter = (hunkIndex: number, lineIndex: number, buttons: number) => {
    if (!draggingRef.current) return
    if (buttons === 0) {
      draggingRef.current = false
      return
    }
    setDrag((prev) => (prev && prev.hunkIndex === hunkIndex ? { ...prev, focus: lineIndex } : prev))
  }

  const lineKeysFor = (hunkIndex: number): Set<string> => {
    if (!patch || !lineSelection || lineSelection.hunkIndex !== hunkIndex) return new Set()
    // Annotate with the active `ignoreWS` so whitespace-only `_hidden` lines a
    // drag visually skipped over are excluded from the generated patch.
    const hunk = annotateHunks(parseUnifiedDiff(patch), { ignoreWhitespace: ignoreWS })[hunkIndex]
    if (!hunk) return new Set()
    return selectionKeysForLineRange(hunk, hunkIndex, lineSelection.start, lineSelection.end)
  }

  const handleStageLines = (hunkIndex: number) => {
    if (!patch || !onApplyPatch) return
    const keys = lineKeysFor(hunkIndex)
    if (keys.size === 0) return
    onApplyPatch(generateSelectedPatch(patch, keys, false), false)
    setDrag(null)
  }

  const handleUnstageLines = (hunkIndex: number) => {
    if (!patch || !onApplyPatch) return
    const keys = lineKeysFor(hunkIndex)
    if (keys.size === 0) return
    onApplyPatch(generateSelectedPatch(patch, keys, true), true)
    setDrag(null)
  }

  const handleDiscardLines = (hunkIndex: number) => {
    if (!patch || !onDiscardPatch) return
    const keys = lineKeysFor(hunkIndex)
    if (keys.size === 0) return
    onDiscardPatch(generateSelectedPatch(patch, keys, true))
    setDrag(null)
  }

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
    // `reverse=isStaged`: when viewing a staged file the user is unstaging,
    // and `generateSelectedPatch` needs to know to handle unselected `+/-`
    // lines correctly for reverse direction (skip vs context flip).
    onApplyPatch(generateSelectedPatch(patch, selectedLines, !!isStaged), !!isStaged)
    setSelectable(false)
    setSelectedLines(new Set())
  }

  const handleDiscardSelection = () => {
    if (!patch || !onDiscardPatch) return
    // Discard is always applied with `cached: false, reverse: true` against
    // the working tree; the patch's "new" side is the working tree state,
    // so unselected `+/-` follow the reverse-direction rules.
    onDiscardPatch(generateSelectedPatch(patch, selectedLines, true))
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
            {/* Intra dropdown — uses the shared `OptionPicker` recipe so the
                touch-friendly portalled popover matches every other
                dropdown in the app instead of the native `<select>` UA
                widget (which positions inconsistently on iOS / Android web
                small screens). */}
            <IntraPicker value={intra} onChange={onIntraChange} />
          </div>
        )}

        {/* Row 3 — checkbox-mode selection actions + Select Lines toggle, and
            the Resolve Conflicts button. In drag mode the line actions live on
            the hunk headers (they morph to "Stage/Discard Lines"), so this row
            only renders when a conflict needs resolving. */}
        {path && isEditable && (!dragMode || isConflicted) && (
          <div className="px-2 border-t flex items-center gap-2 h-[50px] border-(--border-subtle)">
            <div className="flex items-center gap-2 flex-1">
              {!dragMode && selectable && (
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
              {!dragMode && (
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
              )}
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
              selectable={!dragMode && selectable}
              selectedLines={selectedLines}
              onToggleLineSelection={toggleLineSelection}
              onToggleHunkSelection={toggleHunkSelection}
              isStaged={isStaged}
              isEditable={isEditable}
              onStageHunk={handleStageHunk}
              onUnstageHunk={handleUnstageHunk}
              onDiscardHunk={handleDiscardHunk}
              selectionMode={selectionMode}
              lineSelection={lineSelection}
              onLinePointerDown={onLinePointerDown}
              onLinePointerEnter={onLinePointerEnter}
              onStageLines={handleStageLines}
              onUnstageLines={handleUnstageLines}
              onDiscardLines={handleDiscardLines}
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

const INTRA_OPTIONS: ReadonlyArray<{ value: IntraMode; label: string }> = [
  { value: 'none', label: 'none' },
  { value: 'word', label: 'word' },
  { value: 'char', label: 'char' },
]

/**
 * `OptionPicker`-anchored Intra dropdown trigger. Standard-picker shell
 * (border + chevron) wrapped around the same `OptionPicker` recipe used by
 * Stories filters / LiveData provider picks — gives the diff toolbar a
 * dropdown that positions reliably on small-screen web, instead of the
 * native `<select>` which renders inconsistently across iOS / Android.
 */
function IntraPicker({
  value,
  onChange,
}: {
  value: IntraMode
  onChange: (next: IntraMode) => void
}) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  return (
    <div className="inline-flex items-center gap-1">
      <span>Intra</span>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded border border-(--border-subtle) bg-(--surface-raised) px-1.5 py-0.5 text-(--text-primary) hover:bg-(--surface-muted)"
      >
        <span>{value}</span>
        <IconChevron className="w-2.5 h-2.5" style={{ transform: 'rotate(90deg)' }} />
      </button>
      {open && triggerRef.current && (
        <OptionPicker
          anchorEl={triggerRef.current}
          value={value}
          options={INTRA_OPTIONS}
          ariaLabel="Intra-line highlighting"
          onSelect={(v) => {
            onChange(v as IntraMode)
            setOpen(false)
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}
