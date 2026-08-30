import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

export type FullScreenOverlayProps = {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  /** Header title. When omitted the header still renders its close button. */
  title?: string
  /** Controls rendered left of the close button. */
  headerActions?: ReactNode
  /** Drop the header entirely — `children` then own the whole surface. */
  hideHeader?: boolean
  closeOnEsc?: boolean
}

const TRANSITION_MS = 300

/**
 * Edge-to-edge overlay — the web counterpart to the native `FullScreenOverlay`.
 * Portals to <body> and pins to `fixed inset-0`, so it covers the ENTIRE app
 * (sidebar included) rather than docking inside a pane. Same mechanics as
 * `BottomSheet`: body-scroll lock, Escape dismissal, and a two-step mount so
 * the entry and exit transitions both play.
 */
export function FullScreenOverlay({
  isOpen,
  onClose,
  children,
  title,
  headerActions,
  hideHeader = false,
  closeOnEsc = true,
}: FullScreenOverlayProps) {
  // `render` keeps the node mounted through the exit animation, `shown` drives
  // the transform/opacity.
  const [render, setRender] = useState(isOpen)
  const [shown, setShown] = useState(false)
  const scrimRef = useRef<HTMLDivElement | null>(null)
  const reactId = useId()
  const titleId = `full-screen-overlay-title-${reactId}`

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
  // start state rather than snapping straight to open.
  useEffect(() => {
    if (!render || !isOpen) return
    const r = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(r)
  }, [render, isOpen])

  useEffect(() => {
    if (!isOpen || !closeOnEsc) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, closeOnEsc, onClose])

  useEffect(() => {
    if (!render) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [render])

  // The panel covers the scrim once open; the scrim is reachable only while the
  // panel is sliding in or out, where a click reads as "take me back".
  const onScrimMouseDown = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (e.target === scrimRef.current) onClose()
    },
    [onClose],
  )

  if (!render) return null

  return createPortal(
    <div className="fixed inset-0 z-[1000]">
      <div
        ref={scrimRef}
        onMouseDown={onScrimMouseDown}
        className="absolute inset-0 bg-black/40 transition-opacity duration-300"
        style={{ opacity: shown ? 1 : 0 }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : 'Overlay'}
        className="absolute inset-0 flex flex-col ease-out"
        style={{
          transform: shown ? 'translateY(0)' : 'translateY(2%)',
          opacity: shown ? 1 : 0,
          transition: `transform ${TRANSITION_MS}ms ease-out, opacity ${TRANSITION_MS}ms ease-out`,
          background: 'var(--surface-base)',
        }}
      >
        {!hideHeader && (
          <header
            className="shrink-0 flex items-center gap-2 px-3 py-2 border-b"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-raised)' }}
          >
            {title ? (
              <span
                id={titleId}
                className="min-w-0 truncate text-sm font-semibold text-(--text-primary)"
              >
                {title}
              </span>
            ) : null}
            <div className="flex items-center gap-2 shrink-0 ml-auto">
              {headerActions}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                title="Close"
                className="inline-flex items-center justify-center w-8 h-8 rounded border border-(--border-subtle) bg-(--surface-overlay) text-(--text-secondary) hover:bg-(--surface-hover)"
              >
                <CloseIcon />
              </button>
            </div>
          </header>
        )}
        <div className="flex-1 min-h-0">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
