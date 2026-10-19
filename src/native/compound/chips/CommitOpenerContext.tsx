import { createContext, useContext, type ReactNode } from 'react'
import type { CommitOpener } from './commitOpenerTypes'

const CommitOpenerContext = createContext<CommitOpener | undefined>(undefined)

/**
 * Hands every `CommitChip` the app's way to open a commit in its Git screen —
 * the native peer of web's chip navigating to `commitGitViewPath`. Mounted
 * once above the `OverlayProvider`, so chips inside sheets read it too.
 */
export function CommitOpenerProvider({
  value,
  children,
}: {
  value: CommitOpener
  children: ReactNode
}) {
  return <CommitOpenerContext.Provider value={value}>{children}</CommitOpenerContext.Provider>
}

/** The app's {@link CommitOpener}; `undefined` when none is mounted. */
export function useCommitOpener(): CommitOpener | undefined {
  return useContext(CommitOpenerContext)
}
