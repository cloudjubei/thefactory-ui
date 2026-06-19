import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react'
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
import { BinaryDiffView, type BinaryDiffRecovery } from './BinaryDiffView'

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
  /** Git flagged this file binary — render the binary-diff view, not the patch. */
  binary?: boolean
  /** Byte size of the before side (drives the binary-diff Before → After view). */
  beforeSize?: number
  /** Byte size of the after side. */
  afterSize?: number
  /**
   * On-demand recovery for a binary / unparseable file: sanitize both sides in
   * memory and return a text diff. Wiring this in enables the "quick fix" button.
   */
  onRecoverText?: () => Promise<BinaryDiffRecovery>
  /** Persist the recovery — write the sanitized content back to the working tree. */
  onApplyTextRecovery?: () => void | Promise<void>
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
  binary,
  beforeSize,
  afterSize,
  onRecoverText,
  onApplyTextRecovery,
}: DiffViewerProps) {
  const isEditable = !!onApplyPatch
  const dragMode = selectionMode === 'drag'

  const [selectable, setSelectable] = useState(false)
  const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set())
  // Drag mode only: double-click drops into native text-selection (see #E.5).
  const [textSelect, setTextSelect] = useState(false)

  // Drag mode (pointer): a contiguous single-hunk row selection; `focus`
  // follows the pointer from `anchor`.
  const [drag, setDrag] = useState<{ hunkIndex: number; anchor: number; focus: number } | null>(
    null,
  )
  const draggingRef = useRef(false)

  useEffect(() => {
    setSelectedLines(new Set())
    setSelectable(false)
    setDrag(null)
    setTextSelect(false)
    draggingRef.current = false
  }, [patch, path])

  // End-of-drag: one window listener for the component's lifetime, so it can't
  // leak and still catches `pointercancel` / a release outside the window.
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

  // Leave text-select mode on Esc, or a pointer-down outside the selection box
  // (so clicking the selected text — e.g. to right-click → Copy — keeps it).
  useEffect(() => {
    if (!textSelect) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTextSelect(false)
    }
    const onPointerDown = (e: PointerEvent) => {
      const sel = typeof window !== 'undefined' ? window.getSelection?.() : null
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        setTextSelect(false)
        return
      }
      const rects = sel.getRangeAt(0).getClientRects()
      for (let i = 0; i < rects.length; i++) {
        const r = rects[i]
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
          return
        }
      }
      setTextSelect(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [textSelect])

  // Double-click on a line requests text-select mode; clear any stray 1-row
  // drag the double-click's clicks armed so no row stays highlighted.
  const onRequestTextSelect = () => {
    setDrag(null)
    draggingRef.current = false
    setTextSelect(true)
  }

  // A non-empty patch that parses to zero hunks isn't a real unified diff —
  // treat it like a binary file so the recovery view can offer a quick fix.
  const isUnparseable = useMemo(
    () => !binary && !!patch && parseUnifiedDiff(patch).length === 0,
    [binary, patch],
  )
  const showBinaryView = !!path && (!!binary || isUnparseable)

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

  // Extend within the drag's own hunk only (keeps the range contiguous).
  // `buttons === 0` ⇒ the button was released off-window: disarm.
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
    // Annotate with the active `ignoreWS` so whitespace-only `_hidden` lines the
    // drag skipped over are excluded from the patch.
    const hunk = annotateHunks(parseUnifiedDiff(patch), { ignoreWhitespace: ignoreWS })[hunkIndex]
    if (!hunk) return new Set()
    return selectionKeysForLineRange(hunk, hunkIndex, lineSelection.start, lineSelection.end)
  }

  // Text of the active row (drag) selection — every visible line in the range,
  // marker-free, newline-joined. Drives Ctrl/Cmd+C + the right-click Copy menu
  // when the selection was made by row-drag (which has no native text selection).
  const getRowSelectionText = (): string | null => {
    if (!patch || !lineSelection) return null
    const hunk = annotateHunks(parseUnifiedDiff(patch), { ignoreWhitespace: ignoreWS })[
      lineSelection.hunkIndex
    ]
    if (!hunk) return null
    const lo = Math.min(lineSelection.start, lineSelection.end)
    const hi = Math.max(lineSelection.start, lineSelection.end)
    const text = hunk.lines
      .filter((l, idx) => idx >= lo && idx <= hi && !l._hidden && l.type !== 'meta')
      .map((l) => l.text)
      .join('\n')
    return text || null
  }

  // Ctrl/Cmd+C copies the row selection's text (no native selection exists in
  // drag mode). A real text selection (text-select mode) is left to the browser.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || (e.key !== 'c' && e.key !== 'C')) return
      const native = typeof window !== 'undefined' ? window.getSelection?.() : null
      if (native && !native.isCollapsed) return
      const text = getRowSelectionText()
      if (text) {
        void navigator.clipboard?.writeText(text)
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patch, ignoreWS, drag])

  // Right-click Copy for the row selection — a tiny custom menu, since with no
  // native selection the browser's own context menu has no Copy entry.
  const [copyMenu, setCopyMenu] = useState<{ x: number; y: number } | null>(null)
  useEffect(() => {
    if (!copyMenu) return
    // Bubble phase so the menu's own `stopPropagation` keeps a click on "Copy"
    // from closing it before the button's onClick fires.
    const close = () => setCopyMenu(null)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCopyMenu(null)
    }
    window.addEventListener('pointerdown', close)
    window.addEventListener('scroll', close, true)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [copyMenu])

  const onDiffContextMenu = (e: ReactMouseEvent) => {
    const native = typeof window !== 'undefined' ? window.getSelection?.() : null
    if (native && !native.isCollapsed) return // real text selection → native menu
    if (!getRowSelectionText()) return
    e.preventDefault()
    setCopyMenu({ x: e.clientX, y: e.clientY })
  }

  const copyRowSelection = () => {
    const text = getRowSelectionText()
    if (text) void navigator.clipboard?.writeText(text)
    setCopyMenu(null)
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
        {path && isEditable && !showBinaryView && (!dragMode || isConflicted) && (
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
      <div
        className="relative flex-1 overflow-y-auto overflow-x-hidden min-h-0 w-full"
        onContextMenu={onDiffContextMenu}
      >
        {path ? (
          showBinaryView ? (
            <BinaryDiffView
              path={path}
              reason={binary ? 'binary' : 'unparseable'}
              beforeSize={beforeSize}
              afterSize={afterSize}
              onRecover={onRecoverText}
              onApplyRecovery={onApplyTextRecovery}
              diffOpts={{ wrap, ignoreWS, intra }}
            />
          ) : patch ? (
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
              textSelect={textSelect}
              onRequestTextSelect={onRequestTextSelect}
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

      {/* Right-click Copy menu for a row (drag) selection. */}
      {copyMenu && (
        <div
          className="fixed z-50 rounded border border-(--border-default) bg-(--surface-raised) shadow-lg py-1 text-xs"
          style={{ top: copyMenu.y, left: copyMenu.x }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={copyRowSelection}
            className="block w-full text-left px-3 py-1 hover:bg-(--surface-hover) text-(--text-primary)"
          >
            Copy
          </button>
        </div>
      )}
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
