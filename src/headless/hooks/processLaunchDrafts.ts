import type { ProcessLaunchDraft } from '../utils/processLaunchFormTypes'

const drafts = new Map<string, ProcessLaunchDraft>()
const listeners = new Map<string, Set<() => void>>()

/**
 * The form a launch is being filled in, by launch key, outside any one screen:
 * on a phone a variant is edited on a screen pushed over the form, and both are
 * looking at the same draft.
 */
export const processLaunchDrafts = {
  read: (key: string): ProcessLaunchDraft | undefined => drafts.get(key),
  write(key: string, draft: ProcessLaunchDraft): void {
    drafts.set(key, draft)
    listeners.get(key)?.forEach((listener) => listener())
  },
  clear(key: string): void {
    drafts.delete(key)
    listeners.get(key)?.forEach((listener) => listener())
  },
  listen(key: string, listener: () => void): () => void {
    const own = listeners.get(key) ?? new Set()
    own.add(listener)
    listeners.set(key, own)
    return () => {
      own.delete(listener)
      if (own.size === 0) listeners.delete(key)
    }
  },
}
