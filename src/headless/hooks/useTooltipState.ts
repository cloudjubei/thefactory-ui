import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseTooltipStateOptions {
  /** Delay before `show()` opens the tooltip. Ignored when called with `immediate`. */
  delayMs?: number
  /** Delay before `hide()` closes the tooltip. Ignored when called with `immediate`. */
  closeDelayMs?: number
  /** When true, `show()` is a no-op. */
  disabled?: boolean
}

export interface UseTooltipState {
  open: boolean
  show: (immediate?: boolean) => void
  hide: (immediate?: boolean) => void
  setOpen: (open: boolean) => void
}

/**
 * Open/close state machine with delayed transitions. Shared between web's
 * hover-delayed tooltip and native's long-press tooltip — the platform
 * decides the input mechanism, this hook owns the timing.
 */
export function useTooltipState({
  delayMs = 300,
  closeDelayMs = 160,
  disabled = false,
}: UseTooltipStateOptions = {}): UseTooltipState {
  const [open, setOpen] = useState(false)
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearShow = () => {
    if (showTimer.current) {
      clearTimeout(showTimer.current)
      showTimer.current = null
    }
  }
  const clearHide = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current)
      hideTimer.current = null
    }
  }

  const show = useCallback(
    (immediate = false) => {
      if (disabled) return
      clearHide()
      clearShow()
      if (immediate || delayMs <= 0) {
        setOpen(true)
        return
      }
      showTimer.current = setTimeout(() => setOpen(true), delayMs)
    },
    [disabled, delayMs],
  )

  const hide = useCallback(
    (immediate = false) => {
      clearShow()
      clearHide()
      if (immediate || closeDelayMs <= 0) {
        setOpen(false)
        return
      }
      hideTimer.current = setTimeout(() => setOpen(false), closeDelayMs)
    },
    [closeDelayMs],
  )

  useEffect(() => {
    return () => {
      clearShow()
      clearHide()
    }
  }, [])

  return { open, show, hide, setOpen }
}
