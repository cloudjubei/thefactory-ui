import type { PointerEvent } from 'react'

export type GitCommitGraphHeaderProps = {
  title: string
  width?: number
  /** When set, column sizes intrinsically (`width: auto`) up to `maxWidth`. */
  autoWidth?: boolean
  minWidth?: number
  maxWidth?: number
  onResize?: (w: number) => void
  /** Absorb remaining horizontal space — used by the Description column. */
  flex1?: boolean
}

export default function GitCommitGraphHeader({
  title,
  width,
  autoWidth,
  minWidth = 50,
  maxWidth = 500,
  onResize,
  flex1,
}: GitCommitGraphHeaderProps) {
  const handlePointerDown = (e: PointerEvent) => {
    if (!onResize || width === undefined) return
    e.preventDefault()
    const startX = e.clientX
    const startW = width
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    const onMove = (ev: globalThis.PointerEvent) =>
      onResize(Math.max(minWidth, Math.min(maxWidth, startW + ev.clientX - startX)))
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const widthStyle = flex1
    ? undefined
    : autoWidth
      ? { maxWidth }
      : width !== undefined
        ? { width }
        : undefined

  const layoutClass = flex1 ? 'flex-1 min-w-0' : autoWidth ? 'shrink-0 w-auto' : 'shrink-0'

  return (
    <div
      className={`relative px-2 py-1 flex items-center border-r text-xs font-semibold border-(--border-subtle) text-(--text-muted) bg-(--surface-muted) ${layoutClass}`}
      style={widthStyle}
    >
      <span className="truncate">{title}</span>
      {!flex1 && !autoWidth && onResize && width !== undefined && (
        <div
          onPointerDown={handlePointerDown}
          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-sky-500/50"
          style={{ right: -1, zIndex: 10 }}
        />
      )}
    </div>
  )
}
