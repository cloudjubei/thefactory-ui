import { useCallback, useEffect, useRef, useState } from 'react'
import { placeToast } from '../utils/toastQueue'

export type ToastVariant = 'default' | 'success' | 'error' | 'warning'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastMessage {
  /** A toast already showing under this id is replaced rather than stacked. */
  id?: string
  title?: string
  description?: string
  variant?: ToastVariant
  /** Auto-dismiss delay in ms. `0` keeps the toast until explicitly closed. */
  durationMs?: number
  action?: ToastAction
}

export interface ToastItem extends Required<Omit<ToastMessage, 'action'>> {
  action: ToastAction
  isClosing: boolean
}

export interface UseToastQueue {
  items: ToastItem[]
  add: (msg: ToastMessage) => void
  /** Marks `isClosing` and removes after the caller's exit-animation finishes. */
  startClose: (id: string, afterMs?: number) => void
  remove: (id: string) => void
}

const DEFAULT_DURATION_MS = 3500
const DEFAULT_CLOSE_ANIMATION_MS = 200

const NOOP_ACTION: ToastAction = { label: '', onClick: () => {} }

/**
 * Append-with-dismiss queue. Owns ids, auto-dismiss timers, and the
 * `isClosing` flag that lets a renderer animate exit before the item leaves
 * the array. Shared between web (DOM portal) and native (overlay view).
 */
export function useToastQueue(): UseToastQueue {
  const [items, setItems] = useState<ToastItem[]>([])
  const idSeq = useRef(0)
  const closeTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const dismissTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const clearTimers = useCallback((id: string) => {
    for (const timers of [closeTimers.current, dismissTimers.current]) {
      const t = timers.get(id)
      if (t) {
        clearTimeout(t)
        timers.delete(id)
      }
    }
  }, [])

  const remove = useCallback(
    (id: string) => {
      setItems((xs) => xs.filter((x) => x.id !== id))
      clearTimers(id)
    },
    [clearTimers],
  )

  const startClose = useCallback(
    (id: string, afterMs = DEFAULT_CLOSE_ANIMATION_MS) => {
      setItems((xs) => xs.map((x) => (x.id === id ? { ...x, isClosing: true } : x)))
      const timeout = setTimeout(() => remove(id), afterMs)
      closeTimers.current.set(id, timeout)
    },
    [remove],
  )

  const add = useCallback(
    (msg: ToastMessage) => {
      const id = msg.id || String(++idSeq.current)
      const duration = msg.durationMs ?? DEFAULT_DURATION_MS
      const item: ToastItem = {
        id,
        title: msg.title ?? '',
        description: msg.description ?? '',
        variant: msg.variant ?? 'default',
        durationMs: duration,
        action: msg.action ?? NOOP_ACTION,
        isClosing: false,
      }
      clearTimers(id)
      setItems((xs) => placeToast(xs, item))
      if (duration > 0) {
        dismissTimers.current.set(
          id,
          setTimeout(() => {
            dismissTimers.current.delete(id)
            startClose(id)
          }, duration),
        )
      }
    },
    [startClose, clearTimers],
  )

  useEffect(() => {
    const all = [closeTimers.current, dismissTimers.current]
    return () => {
      for (const timers of all) {
        timers.forEach((t) => clearTimeout(t))
        timers.clear()
      }
    }
  }, [])

  return { items, add, startClose, remove }
}
