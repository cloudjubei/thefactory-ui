import { useCallback, useState } from 'react'

import { attemptStoryChange } from '../utils/storyWriteErrors'

export interface UseStoryChangeError {
  /** Why the last change failed, in the backend's words; `undefined` when it did not. */
  error: string | undefined
  /** Make a change, clearing the last error and keeping why it failed. Answers whether it went through. */
  attempt: (change: () => Promise<unknown>) => Promise<boolean>
  /** Put the error away. */
  dismiss: () => void
}

/**
 * The story and feature changes a screen makes outside a form — a status menu,
 * a delete — and why the last one failed, so the person is shown a refusal
 * instead of it going only to the console.
 */
export function useStoryChangeError(): UseStoryChangeError {
  const [error, setError] = useState<string | undefined>(undefined)
  const attempt = useCallback(
    (change: () => Promise<unknown>) => attemptStoryChange(change, setError),
    [],
  )
  const dismiss = useCallback(() => setError(undefined), [])
  return { error, attempt, dismiss }
}
