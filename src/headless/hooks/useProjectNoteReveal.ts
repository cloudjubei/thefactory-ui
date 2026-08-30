import { useCallback, useEffect, useRef, useState } from 'react'
import { NOTE_REVEAL_TIMEOUT_MS } from '../utils/projectNotesConstants'

export type UseProjectNoteReveal = {
  /** The note whose value is on screen right now, if any. */
  revealedNoteId: string | null
  /** The revealed value. Held only while it is on screen. */
  revealedValue: string | null
  /** The note whose reveal request is in flight. */
  revealingNoteId: string | null
  revealError: string | null
  reveal: (noteId: string) => Promise<void>
  hide: () => void
}

/**
 * One-at-a-time, explicitly requested reveal of a stored note value, which
 * masks itself again after {@link timeoutMs}. The value is never fetched to
 * render a list — only on this deliberate user action — and it is dropped from
 * memory the moment the reveal ends.
 */
export function useProjectNoteReveal(
  revealNote: (noteId: string) => Promise<string>,
  timeoutMs: number = NOTE_REVEAL_TIMEOUT_MS,
): UseProjectNoteReveal {
  const [revealedNoteId, setRevealedNoteId] = useState<string | null>(null)
  const [revealedValue, setRevealedValue] = useState<string | null>(null)
  const [revealingNoteId, setRevealingNoteId] = useState<string | null>(null)
  const [revealError, setRevealError] = useState<string | null>(null)
  const requestRef = useRef<object | null>(null)

  const hide = useCallback(() => {
    requestRef.current = null
    setRevealedNoteId(null)
    setRevealedValue(null)
    setRevealError(null)
  }, [])

  const reveal = useCallback(
    async (noteId: string) => {
      const request = {}
      requestRef.current = request
      setRevealingNoteId(noteId)
      setRevealError(null)
      setRevealedNoteId(null)
      setRevealedValue(null)
      try {
        const value = await revealNote(noteId)
        if (requestRef.current !== request) return
        setRevealedNoteId(noteId)
        setRevealedValue(value)
      } catch (err) {
        if (requestRef.current !== request) return
        setRevealError(err instanceof Error ? err.message : 'Could not reveal this value.')
      } finally {
        setRevealingNoteId((current) => (current === noteId ? null : current))
      }
    },
    [revealNote],
  )

  useEffect(() => {
    if (revealedNoteId === null) return
    const timer = setTimeout(hide, timeoutMs)
    return () => clearTimeout(timer)
  }, [revealedNoteId, timeoutMs, hide])

  return { revealedNoteId, revealedValue, revealingNoteId, revealError, reveal, hide }
}
