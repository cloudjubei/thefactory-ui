import { useCallback, useState } from 'react'

export interface UseDirtyGuard {
  /** True when the guarded form has unsaved edits. */
  dirty: boolean
  setDirty: (dirty: boolean) => void
  /** True while the discard-confirmation should be shown. */
  confirmOpen: boolean
  /** Close-intent. Opens the discard confirmation when `dirty`, else closes. */
  attemptClose: () => void
  /** User confirmed discarding edits — clears `dirty` and closes. */
  confirmDiscard: () => void
  /** User chose to keep editing — dismisses the confirmation. */
  cancelDiscard: () => void
}

/**
 * Unsaved-changes guard for form modals. Renderer-agnostic state machine
 * shared by web's and native's `StoriesModalHost`: the host wires `setDirty`
 * to its form's dirty signal, routes the modal's backdrop / Cancel to
 * `attemptClose`, and renders its own confirmation dialog from `confirmOpen`
 * + `confirmDiscard` / `cancelDiscard`.
 *
 * `onClose` is the underlying close — the host typically passes a callback
 * that also resets its transient state (error banners, pickers).
 */
export function useDirtyGuard(onClose: () => void): UseDirtyGuard {
  const [dirty, setDirty] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const attemptClose = useCallback(() => {
    if (dirty) {
      setConfirmOpen(true)
      return
    }
    onClose()
  }, [dirty, onClose])

  const confirmDiscard = useCallback(() => {
    setConfirmOpen(false)
    setDirty(false)
    onClose()
  }, [onClose])

  const cancelDiscard = useCallback(() => setConfirmOpen(false), [])

  return { dirty, setDirty, confirmOpen, attemptClose, confirmDiscard, cancelDiscard }
}
