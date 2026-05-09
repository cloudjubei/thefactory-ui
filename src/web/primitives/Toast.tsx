import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

export type ToastVariant = 'default' | 'success' | 'error' | 'warning'

export type ToastMessage = {
  id?: string
  title?: string
  description?: string
  variant?: ToastVariant
  durationMs?: number
  action?: { label: string; onClick: () => void }
}

type ToastCtx = { toast: (msg: ToastMessage) => void }

const Ctx = createContext<ToastCtx | null>(null)

type ToastItem = Required<ToastMessage> & { isClosing?: boolean }

function useToastsState() {
  const [items, setItems] = useState<ToastItem[]>([])
  const idSeq = useRef(0)
  const closeTimers = useRef(new Map<string, number>())

  const remove = useCallback((id: string) => {
    setItems((xs) => xs.filter((x) => x.id !== id))
    const t = closeTimers.current.get(id)
    if (t) {
      clearTimeout(t)
      closeTimers.current.delete(id)
    }
  }, [])

  const startClose = useCallback(
    (id: string, afterMs = 200) => {
      setItems((xs) => xs.map((x) => (x.id === id ? { ...x, isClosing: true } : x)))
      const timeout = window.setTimeout(() => remove(id), afterMs)
      closeTimers.current.set(id, timeout)
    },
    [remove],
  )

  const add = useCallback(
    (msg: ToastMessage) => {
      const id = msg.id || String(++idSeq.current)
      const duration = msg.durationMs ?? 3500
      const item: ToastItem = {
        id,
        title: msg.title ?? '',
        description: msg.description ?? '',
        variant: msg.variant ?? 'default',
        durationMs: duration,
        action: msg.action ?? { label: '', onClick: () => {} },
        isClosing: false,
      }
      setItems((xs) => [...xs, item])
      if (duration > 0) {
        window.setTimeout(() => startClose(id), duration)
      }
    },
    [startClose],
  )

  return { items, add, startClose, remove }
}

function VariantIcon({ variant }: { variant: ToastVariant }) {
  const styles = (() => {
    switch (variant) {
      case 'success':
        return {
          wrapper: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
          icon: '✔',
        }
      case 'error':
        return { wrapper: 'bg-red-500/15 text-red-600 dark:text-red-400', icon: '⚠' }
      case 'warning':
        return { wrapper: 'bg-amber-500/20 text-amber-700 dark:text-amber-300', icon: '!' }
      default:
        return { wrapper: 'bg-gray-500/15 text-gray-600 dark:text-gray-300', icon: '•' }
    }
  })()
  return (
    <div
      className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${styles.wrapper}`}
      aria-hidden="true"
    >
      <span className="text-sm leading-none">{styles.icon}</span>
    </div>
  )
}

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2" />
      <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function ToastView({ item, onClose }: { item: ToastItem; onClose: (id: string) => void }) {
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [flickDismiss, setFlickDismiss] = useState(false)
  const startYRef = useRef(0)
  const lastYRef = useRef(0)
  const startTimeRef = useRef(0)

  const [entered, setEntered] = useState(false)
  useEffect(() => {
    const r = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(r)
  }, [])

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (item.isClosing) return
    setDragging(true)
    startYRef.current = e.clientY
    lastYRef.current = e.clientY
    startTimeRef.current = performance.now()
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging || item.isClosing) return
    const dy = e.clientY - startYRef.current
    const clamped = Math.min(0, dy)
    lastYRef.current = e.clientY
    setDragY(clamped)
  }

  const onPointerUp = () => {
    if (!dragging) return
    setDragging(false)
    const totalDy = Math.min(0, lastYRef.current - startYRef.current)
    const dt = Math.max(1, performance.now() - startTimeRef.current)
    const velocity = totalDy / dt

    const DISMISS_DISTANCE = -48
    const FLICK_VELOCITY = -0.6

    if (totalDy <= DISMISS_DISTANCE || velocity <= FLICK_VELOCITY) {
      setFlickDismiss(true)
      onClose(item.id)
    } else {
      setDragY(0)
    }
  }

  const easingEnter = 'cubic-bezier(0.22, 1, 0.36, 1)'
  const easingExit = 'cubic-bezier(0.4, 0, 1, 1)'

  let transform = ''
  let opacity: number | undefined
  let transition = ''

  if (dragging || flickDismiss) {
    transform = `translate3d(0, ${dragY}px, 0)`
    opacity = Math.max(0.25, Math.min(1, 1 + dragY / 80))
    transition = 'none'
  } else if (item.isClosing) {
    transform = 'translate3d(0, -10px, 0)'
    opacity = 0
    transition = `transform 180ms ${easingExit}, opacity 160ms ${easingExit}`
  } else if (!entered) {
    transform = 'translate3d(0, -10px, 0)'
    opacity = 0
    transition = 'none'
  } else {
    transform = 'translate3d(0, 0, 0)'
    opacity = 1
    transition = `transform 200ms ${easingEnter}, opacity 200ms ${easingEnter}`
  }

  const style: CSSProperties = {
    transform,
    opacity,
    transition,
    touchAction: 'none',
  }

  return (
    <div
      className="pointer-events-auto w-[340px] overflow-hidden rounded-2xl shadow-xl select-none"
      role="status"
      aria-live="polite"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={style}
    >
      <div className="group flex items-start gap-3 px-3.5 py-3 rounded-2xl border border-black/5 dark:border-white/5 bg-white/80 dark:bg-gray-900/70 backdrop-blur supports-[backdrop-filter]:backdrop-blur-md">
        <VariantIcon variant={item.variant} />
        <div className="min-w-0 flex-1">
          {item.title ? (
            <div className="text-sm font-medium text-text-primary truncate">{item.title}</div>
          ) : null}
          {item.description ? (
            <div className="mt-0.5 text-[13px] text-text-secondary line-clamp-3">
              {item.description}
            </div>
          ) : null}
          <div className="mt-2 flex items-center gap-2">
            {item.action?.label ? (
              <button
                type="button"
                className="text-xs font-medium px-2 py-1 rounded-full bg-black/5 dark:bg-white/10 text-text-primary hover:bg-black/10 dark:hover:bg-white/15 transition"
                onClick={() => {
                  item.action?.onClick?.()
                  onClose(item.id)
                }}
              >
                {item.action.label}
              </button>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          className="-m-1.5 rounded-full p-1.5 text-text-muted hover:bg-black/5 dark:hover:bg-white/10 transition"
          onClick={() => onClose(item.id)}
          aria-label="Close"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  )
}

function ToastViewport({ items, onClose }: { items: ToastItem[]; onClose: (id: string) => void }) {
  return createPortal(
    <div className="pointer-events-none fixed top-5 left-1/2 -translate-x-1/2 z-[1100] flex flex-col items-center gap-2.5">
      {items.map((t) => (
        <ToastView key={t.id} item={t} onClose={onClose} />
      ))}
      <div className="sr-only" aria-live="polite" aria-atomic="true" />
    </div>,
    document.body,
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const { items, add, startClose } = useToastsState()
  const api = useMemo<ToastCtx>(() => ({ toast: add }), [add])
  return (
    <Ctx.Provider value={api}>
      {children}
      <ToastViewport items={items} onClose={startClose} />
    </Ctx.Provider>
  )
}

export function useToast(): ToastCtx {
  const v = useContext(Ctx)
  if (!v) return { toast: () => {} }
  return v
}
