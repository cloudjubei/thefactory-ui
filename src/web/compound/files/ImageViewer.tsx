import { useEffect, useRef, useState } from 'react'

import { Button } from '../../primitives/Button'
import { IconZoomIn, IconZoomOut, IconRefresh } from '../../icons'

export type ImageViewerProps = {
  /** URL the `<img>` will load. Consumer is responsible for auth (e.g. blob URLs). */
  src: string
  /** Alt text for accessibility. */
  alt?: string
}

const MIN_ZOOM = 0.1
const MAX_ZOOM = 8
const ZOOM_STEP = 1.25

export function ImageViewer({ src, alt }: ImageViewerProps) {
  const [zoom, setZoom] = useState(1)
  const [translate, setTranslate] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const dragRef = useRef<{ startX: number; startY: number; tx: number; ty: number } | null>(null)

  // Reset when src changes (different image).
  useEffect(() => {
    setZoom(1)
    setTranslate({ x: 0, y: 0 })
  }, [src])

  const zoomIn = () => setZoom((z) => Math.min(MAX_ZOOM, z * ZOOM_STEP))
  const zoomOut = () => setZoom((z) => Math.max(MIN_ZOOM, z / ZOOM_STEP))
  const reset = () => {
    setZoom(1)
    setTranslate({ x: 0, y: 0 })
  }

  const onWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor)))
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (zoom <= 1) return
    ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, tx: translate.x, ty: translate.y }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setTranslate({ x: dragRef.current.tx + dx, y: dragRef.current.ty + dy })
  }

  const onPointerUp = () => {
    dragRef.current = null
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <div
        className="flex items-center gap-1 px-3 py-1.5 border-b shrink-0 text-xs"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-base)' }}
      >
        <Button
          variant="secondary"
          size="icon"
          onClick={zoomOut}
          aria-label="Zoom out"
          title="Zoom out"
        >
          <IconZoomOut className="w-4 h-4" />
        </Button>
        <span className="tabular-nums w-12 text-center text-(--text-muted)">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="secondary"
          size="icon"
          onClick={zoomIn}
          aria-label="Zoom in"
          title="Zoom in"
        >
          <IconZoomIn className="w-4 h-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={reset}
          aria-label="Reset zoom"
          title="Reset zoom"
        >
          <IconRefresh className="w-4 h-4" />
        </Button>
        <span className="ml-2 text-(--text-muted)">Hold Ctrl/⌘ + scroll to zoom; drag to pan.</span>
      </div>
      <div
        className="flex-1 min-h-0 overflow-auto flex items-center justify-center bg-black/5 dark:bg-white/5"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ cursor: zoom > 1 ? 'grab' : 'default' }}
      >
        <img
          src={src}
          alt={alt ?? ''}
          draggable={false}
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: dragRef.current ? 'none' : 'transform 80ms ease-out',
            maxWidth: '100%',
            maxHeight: '100%',
            userSelect: 'none',
          }}
        />
      </div>
    </div>
  )
}

export default ImageViewer
