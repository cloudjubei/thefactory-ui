import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

export type BottomSheetProps = {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  /** Accessible label for the sheet dialog. */
  ariaLabel?: string
  /**
   * Sheet height as a fraction of the viewport. Default `0.9` — tall enough
   * for a chat surface while leaving a backdrop strip to tap-dismiss.
   * Ignored when either `minHeightFraction` or `maxHeightFraction` is set;
   * in that case the sheet sizes to its content within that range.
   */
  heightFraction?: number
  /** Minimum sheet height as a fraction of the viewport when using dynamic
   *  content-driven sizing. Combine with `maxHeightFraction` to let the
   *  sheet shrink to its content but never collapse past this floor. */
  minHeightFraction?: number
  /** Maximum sheet height as a fraction of the viewport when using dynamic
   *  content-driven sizing. */
  maxHeightFraction?: number
}

const TRANSITION_MS = 300
// Pull down from the handle past this distance (px) to dismiss. Matches the
// native `BottomSheet`'s ergonomics so cross-platform muscle memory carries.
const DISMISS_DRAG_PX = 80

/**
 * Slide-up bottom sheet — the web counterpart to the native `BottomSheet`.
 * Portals to <body> so it's never clipped by an ancestor's
 * `overflow`/`transform`, locks body scroll, and closes on backdrop tap or
 * Escape. Used on narrow layouts where a docked side panel has no room.
 */
export function BottomSheet({
  isOpen,
  onClose,
  children,
  ariaLabel,
  heightFraction = 0.9,
  minHeightFraction,
  maxHeightFraction,
}: BottomSheetProps) {
  const isDynamic = minHeightFraction !== undefined || maxHeightFraction !== undefined
  const dynamicMin =
    minHeightFraction !== undefined ? `${Math.round(minHeightFraction * 100)}dvh` : undefined
  const dynamicMax =
    maxHeightFraction !== undefined ? `${Math.round(maxHeightFraction * 100)}dvh` : undefined
  // Two-step open/close so the slide transition plays in both directions:
  // `render` keeps the node mounted through the exit animation, `shown`
  // drives the transform/opacity.
  const [render, setRender] = useState(isOpen)
  const [shown, setShown] = useState(false)
  const overlayRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      setRender(true)
      return
    }
    setShown(false)
    const t = window.setTimeout(() => setRender(false), TRANSITION_MS)
    return () => window.clearTimeout(t)
  }, [isOpen])

  // Flip `shown` on the frame after mount so the transition runs from the
  // off-screen start state rather than snapping straight to open.
  useEffect(() => {
    if (!render || !isOpen) return
    const r = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(r)
  }, [render, isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!render) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [render])

  const onOverlayMouseDown = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (e.target === overlayRef.current) onClose()
    },
    [onClose],
  )

  // Pull-down dismiss on the handle. The handler captures pointer events on
  // the handle then follows the cursor; when the user releases past the
  // dismiss threshold we close, otherwise we spring back to 0.
  const [dragY, setDragY] = useState(0)
  const dragStartYRef = useRef<number | null>(null)
  const onHandlePointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    dragStartYRef.current = e.clientY
    setDragY(0)
    ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
  }, [])
  const onHandlePointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartYRef.current === null) return
    const dy = e.clientY - dragStartYRef.current
    setDragY(Math.max(0, dy))
  }, [])
  const onHandlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (dragStartYRef.current === null) return
      const dy = e.clientY - dragStartYRef.current
      dragStartYRef.current = null
      ;(e.currentTarget as HTMLDivElement).releasePointerCapture?.(e.pointerId)
      if (dy > DISMISS_DRAG_PX) {
        setDragY(0)
        onClose()
      } else {
        setDragY(0)
      }
    },
    [onClose],
  )

  if (!render) return null

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex flex-col justify-end">
      <div
        ref={overlayRef}
        onMouseDown={onOverlayMouseDown}
        className="absolute inset-0 bg-black/40 transition-opacity duration-300"
        style={{ opacity: shown ? 1 : 0 }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className="relative flex flex-col rounded-t-xl border-t shadow-xl ease-out"
        style={{
          ...(isDynamic
            ? { height: 'auto', minHeight: dynamicMin, maxHeight: dynamicMax }
            : { height: `${Math.round(heightFraction * 100)}dvh` }),
          transform: shown ? `translateY(${dragY}px)` : 'translateY(100%)',
          // While dragging we want the panel to follow the pointer 1:1
          // without an animated catch-up; the spring-back / open animation
          // is driven by the same 300ms transition.
          transition: dragStartYRef.current !== null ? 'none' : 'transform 300ms ease-out',
          background: 'var(--surface-base)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div
          className="shrink-0 flex items-center justify-center py-2 cursor-grab touch-none select-none active:cursor-grabbing"
          aria-hidden
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
        >
          <span className="block h-1 w-9 rounded-full bg-(--text-muted)" />
        </div>
        <div className="flex-1 min-h-0">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
