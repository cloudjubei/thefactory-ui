import { useMemo, useState } from 'react'
// Diff parsing + annotation is single-sourced in
// `headless/utils/diffAnnotate` so web's `StructuredUnifiedDiff` and
// native's `UnifiedDiff` share the same hunk model and identical
// `ignoreWhitespace` / `intra` semantics.
import { generateHunkPatch } from 'thefactory-tools/utils'
import {
  annotateHunks as annotateHunksShared,
  generateSelectedPatch,
  hunkLineRange as hunkLineRangeShared,
  parseUnifiedDiffAnnotated,
  type IntraMode,
  type ParsedDiffHunk,
} from '../../../headless/utils/diffAnnotate'

export { generateHunkPatch, generateSelectedPatch }
export type { IntraMode }

/** Local alias preserved for callers that already import `ParsedHunk` from
 *  this module — same shape as the shared `ParsedDiffHunk`. */
export type ParsedHunk = ParsedDiffHunk

export function parseUnifiedDiff(patch: string): ParsedHunk[] {
  return parseUnifiedDiffAnnotated(patch)
}

// Local aliases — the real implementations are in `headless/utils/diffAnnotate`.
// Keep these one-liners so the rest of this file's references (and any
// downstream importer) don't need to change at the same time.
const annotateHunks = annotateHunksShared
const hunkLineRange = hunkLineRangeShared

export type StructuredUnifiedDiffProps = {
  patch: string
  ignoreWhitespace?: boolean
  wrap?: boolean
  intraline?: IntraMode
  sideBySide?: boolean
  largeGuardLines?: number
  /** Whether selection checkboxes are active */
  selectable?: boolean
  selectedLines?: Set<string>
  onToggleLineSelection?: (hunkIndex: number, lineIndex: number) => void
  onToggleHunkSelection?: (hunkIndex: number) => void
  isStaged?: boolean
  /**
   * Whether edit-mode actions (Stage/Unstage/Discard hunk buttons) should be shown.
   * Independent of `selectable` — buttons show whenever isEditable=true.
   */
  isEditable?: boolean
  onStageHunk?: (hunkIndex: number) => void
  onUnstageHunk?: (hunkIndex: number) => void
  onDiscardHunk?: (hunkIndex: number) => void
}

type DiffLineMarkup = NonNullable<ParsedHunk['lines'][number]['_markup']>
type RenderableLine = ParsedHunk['lines'][number]

function renderCell(
  item: { line: RenderableLine; markup?: DiffLineMarkup } | undefined,
  side: 'left' | 'right',
  wrap: boolean,
) {
  if (!item) {
    return <div className="bg-neutral-50/30 dark:bg-neutral-900/10 min-h-[1.5em]" />
  }
  const { line, markup } = item
  const isDel = line.type === 'del'
  const isAdd = line.type === 'add'

  let bgCls = ''
  if (isDel) bgCls = 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
  else if (isAdd) bgCls = 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'

  const num = side === 'left' ? line.oldLine : line.newLine

  return (
    <div className={`flex w-full relative ${bgCls} group ${wrap ? 'min-w-0' : 'min-w-max'}`}>
      <div className="sticky left-0 z-10 w-[40px] flex-none px-1 py-0.5 text-right select-none text-(--text-muted) bg-inherit tabular-nums border-r border-(--border-subtle) pr-1 text-[10px]">
        <div className="absolute inset-0 bg-(--surface-base) pointer-events-none -z-10" />
        {num || ''}
      </div>
      <div
        className={`px-2 py-0.5 flex-1 pl-2 ${wrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'}`}
      >
        {markup ? (
          <>
            {markup.map((seg, si) =>
              seg.t === 'text' ? (
                <span key={si}>{seg.v}</span>
              ) : seg.t === 'ins' ? (
                <span key={si} className="bg-green-300/40 dark:bg-green-700/40">
                  {seg.v}
                </span>
              ) : (
                <span
                  key={si}
                  className="bg-red-300/40 dark:bg-red-700/40 line-through decoration-red-500/60"
                >
                  {seg.v}
                </span>
              ),
            )}
          </>
        ) : (
          <>{line.text?.length ? line.text : ' '}</>
        )}
      </div>
    </div>
  )
}

function SideBySideContent({ hunks, wrap }: { hunks: ParsedHunk[]; wrap: boolean }) {
  const allRows: Array<{
    left?: { line: any; markup?: any }
    right?: { line: any; markup?: any }
    isHeader?: boolean
    headerText?: string
  }> = []

  hunks.forEach((hunk) => {
    const left = `-${hunk.oldStart}${typeof hunk.oldLines === 'number' ? ',' + hunk.oldLines : ''}`
    const right = `+${hunk.newStart}${typeof hunk.newLines === 'number' ? ',' + hunk.newLines : ''}`
    const header = `@@ ${left} ${right} @@${hunk.header ? ' ' + hunk.header : ''}`

    allRows.push({ isHeader: true, headerText: header })

    const lines = hunk.lines.filter((l) => l.type !== 'meta' && !l._hidden)
    let i = 0
    while (i < lines.length) {
      const ln = lines[i]
      if (ln.type === 'ctx') {
        allRows.push({ left: { line: ln }, right: { line: ln } })
        i++
        continue
      }

      const blockDels: any[] = []
      const blockAdds: any[] = []

      while (i < lines.length && lines[i].type !== 'ctx') {
        if (lines[i].type === 'del') blockDels.push(lines[i])
        else if (lines[i].type === 'add') blockAdds.push(lines[i])
        i++
      }

      const max = Math.max(blockDels.length, blockAdds.length)
      for (let k = 0; k < max; k++) {
        allRows.push({
          left: blockDels[k] ? { line: blockDels[k], markup: blockDels[k]._markup } : undefined,
          right: blockAdds[k] ? { line: blockAdds[k], markup: blockAdds[k]._markup } : undefined,
        })
      }
    }
  })

  return (
    <div className="grid grid-cols-2 divide-x divide-neutral-100 dark:divide-neutral-800 h-full w-full">
      {/* Left Column */}
      <div className="overflow-x-auto overflow-y-hidden relative">
        <div className="min-w-fit relative">
          {allRows.map((row, idx) => (
            <div
              key={idx}
              className={`border-b border-neutral-100 dark:border-neutral-800/50 last:border-b-0 h-[22px] ${row.isHeader ? 'bg-(--surface-overlay) text-(--text-secondary) text-[10px] border-t first:border-t-0' : ''}`}
            >
              {row.isHeader ? (
                <div
                  className="px-2 py-0.5 sticky left-0 z-20 whitespace-nowrap overflow-hidden text-ellipsis h-full w-full"
                  style={{ maxWidth: 'fit-content' }}
                >
                  {row.headerText}
                </div>
              ) : (
                renderCell(row.left, 'left', wrap)
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right Column */}
      <div className="overflow-x-auto overflow-y-hidden relative">
        <div className="min-w-fit relative">
          {allRows.map((row, idx) => (
            <div
              key={idx}
              className={`border-b border-neutral-100 dark:border-neutral-800/50 last:border-b-0 h-[22px] ${row.isHeader ? 'bg-(--surface-overlay) text-(--text-secondary) text-[10px] border-t first:border-t-0' : ''}`}
            >
              {row.isHeader ? (
                <div
                  className="px-2 py-0.5 sticky left-0 z-20 whitespace-nowrap overflow-hidden text-ellipsis h-full w-full"
                  style={{ maxWidth: 'fit-content' }}
                >
                  {row.headerText}
                </div>
              ) : (
                renderCell(row.right, 'right', wrap)
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function StructuredUnifiedDiff(props: StructuredUnifiedDiffProps) {
  const {
    patch,
    ignoreWhitespace = false,
    wrap = false,
    intraline = 'none',
    sideBySide = false,
    largeGuardLines = 5000,
    selectable = false,
    selectedLines,
    onToggleLineSelection,
    onToggleHunkSelection,
    isStaged = false,
    isEditable = false,
    onStageHunk,
    onUnstageHunk,
    onDiscardHunk,
  } = props

  const hunksRaw = useMemo<ParsedHunk[]>(() => parseUnifiedDiff(patch), [patch])
  const totalRenderableLines = useMemo(
    () =>
      hunksRaw.reduce(
        (acc, h) => acc + h.lines.filter((l) => l.type !== 'meta' && !l._hidden).length,
        0,
      ),
    [hunksRaw],
  )

  const [guardBypass, setGuardBypass] = useState(false)
  const hunks = useMemo(
    () => annotateHunks(hunksRaw, { ignoreWhitespace, intra: intraline }),
    [hunksRaw, ignoreWhitespace, intraline],
  )

  if (!guardBypass && totalRenderableLines > largeGuardLines) {
    return (
      <div className="text-xs text-neutral-600 dark:text-neutral-400 p-2 border border-neutral-200 dark:border-neutral-800 rounded">
        <div>
          Diff is very large ({totalRenderableLines} lines). Showing it might freeze the UI.
        </div>
        <button
          onClick={() => setGuardBypass(true)}
          className="mt-2 px-3 py-1 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 rounded text-xs"
        >
          Show anyway
        </button>
      </div>
    )
  }

  if (sideBySide) {
    return (
      <div className="font-mono text-xs text-(--text-primary) bg-(--surface-base) rounded border border-(--border-subtle)">
        <SideBySideContent hunks={hunks} wrap={wrap} />
      </div>
    )
  }

  // Unified view.
  // Layout strategy: each hunk has a sticky header that spans the full visible width (no horizontal
  // scroll on the header). The lines body scrolls horizontally independently per-hunk via
  // overflow-x-auto on a min-w-max inner div. The parent DiffViewer container owns vertical scroll.
  return (
    <div className="font-mono text-xs text-neutral-800 dark:text-neutral-200 bg-white dark:bg-[#1e1e1e]">
      {hunks.map((h, i) => {
        const modLines = h.lines.filter((l) => l.type === 'add' || l.type === 'del')
        const isHunkFullySelected =
          modLines.length > 0 &&
          modLines.every((l) => selectedLines?.has(`${i}:${h.lines.indexOf(l)}`))
        const isHunkPartiallySelected =
          !isHunkFullySelected &&
          modLines.some((l) => selectedLines?.has(`${i}:${h.lines.indexOf(l)}`))
        const { start, end } = hunkLineRange(h)

        return (
          <div
            key={i}
            className="border-b border-neutral-200 dark:border-neutral-800 last:border-b-0"
          >
            {/* Hunk header — sticky, full visible width, never scrolls horizontally */}
            <div className="sticky top-0 z-20 flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800/80 border-b border-neutral-200 dark:border-neutral-800 px-2 h-8 shrink-0 w-full">
              {selectable && (
                <input
                  type="checkbox"
                  className="cursor-pointer flex-none"
                  checked={isHunkFullySelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isHunkPartiallySelected
                  }}
                  onChange={() => onToggleHunkSelection?.(i)}
                />
              )}
              <span className="font-semibold text-neutral-600 dark:text-neutral-300 text-[10px] flex-none">
                Hunk {i + 1}:
              </span>
              <span className="text-neutral-500 dark:text-neutral-400 text-[10px] flex-none">
                Lines {start}–{end}
              </span>
              {/* Spacer pushes buttons to the right */}
              <div className="flex-1 min-w-0" />
              {/* Per-hunk action buttons — always visible when isEditable, regardless of selectable */}
              {isEditable && (
                <div className="flex items-center gap-1 flex-none">
                  <button
                    className={`px-2 py-0.5 rounded text-[10px] font-medium text-white transition-colors ${
                      isStaged
                        ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                        : 'bg-green-600 hover:bg-green-700 active:bg-green-800'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (isStaged) {
                        onUnstageHunk?.(i)
                      } else {
                        onStageHunk?.(i)
                      }
                    }}
                  >
                    {isStaged ? 'Unstage Hunk' : 'Stage Hunk'}
                  </button>
                  <button
                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-600 hover:bg-red-700 active:bg-red-800 text-white transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDiscardHunk?.(i)
                    }}
                  >
                    Discard Hunk
                  </button>
                </div>
              )}
            </div>

            {/* Lines body — scrolls horizontally; vertical scroll is owned by parent */}
            <div className="overflow-x-auto relative">
              <div className={wrap ? 'min-w-0' : 'min-w-max'}>
                <div className="text-[10px] leading-relaxed divide-y divide-neutral-100 dark:divide-neutral-800/50">
                  {h.lines
                    .filter((l) => !l._hidden)
                    .map((ln, j) => {
                      if (ln.type === 'meta') return null
                      let bgCls = ''
                      let marker = ' '
                      if (ln.type === 'add') {
                        bgCls =
                          'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                        marker = '+'
                      } else if (ln.type === 'del') {
                        bgCls = 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                        marker = '-'
                      }

                      const isSelectableLine = ln.type === 'add' || ln.type === 'del'

                      return (
                        <div key={j} className={`flex relative ${bgCls}`}>
                          {/* STICKY LEFT SECTION: Checkbox (if any) + Line numbers + Marker */}
                          <div className="sticky left-0 z-10 flex flex-none bg-inherit border-r border-neutral-200 dark:border-neutral-800 shadow-[1px_0_0_0_transparent] dark:shadow-[1px_0_0_0_transparent]">
                            {/* Force the sticky container to match the background of the row */}
                            <div className="absolute inset-0 bg-neutral-50/95 dark:bg-[#1a1a1a]/95 pointer-events-none -z-10" />
                            {selectable && (
                              <div className="w-[24px] flex-none flex items-center justify-center border-r border-neutral-200/50 dark:border-neutral-800/50">
                                {isSelectableLine && (
                                  <input
                                    type="checkbox"
                                    className="cursor-pointer"
                                    checked={selectedLines?.has(`${i}:${j}`)}
                                    onChange={() => onToggleLineSelection?.(i, j)}
                                  />
                                )}
                              </div>
                            )}
                            {/* Line numbers */}
                            <div className="w-[60px] flex-none flex text-right select-none text-neutral-400 dark:text-neutral-600 border-r border-neutral-200/50 dark:border-neutral-800/50 text-[10px]">
                              <span className="w-1/2 pr-1">
                                {ln.oldLine !== undefined ? ln.oldLine : ''}
                              </span>
                              <span className="w-1/2 pr-1">
                                {ln.newLine !== undefined ? ln.newLine : ''}
                              </span>
                            </div>

                            <div className="w-4 flex-none text-center select-none opacity-50 text-[10px]">
                              {marker}
                            </div>
                          </div>

                          {/* Line content */}
                          <div
                            className={`flex-1 min-w-0 py-0.5 pr-2 pl-2 ${wrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'}`}
                          >
                            {ln._markup ? (
                              <>
                                {ln._markup.map((seg, si) =>
                                  seg.t === 'text' ? (
                                    <span key={si}>{seg.v}</span>
                                  ) : seg.t === 'ins' ? (
                                    <span
                                      key={si}
                                      className="bg-green-300/60 dark:bg-green-700/45 rounded-[2px] px-[1px]"
                                    >
                                      {seg.v}
                                    </span>
                                  ) : (
                                    <span
                                      key={si}
                                      className="bg-red-300/55 dark:bg-red-700/45 rounded-[2px] px-[1px] line-through decoration-red-600/70 decoration-[1px]"
                                    >
                                      {seg.v}
                                    </span>
                                  ),
                                )}
                              </>
                            ) : (
                              <>{ln.text?.length ? ln.text : ' '}</>
                            )}
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

