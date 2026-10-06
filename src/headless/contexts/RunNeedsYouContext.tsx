import { createContext, useContext, type ReactNode } from 'react'

import type { RunNeedsYouActions } from '../utils/runNeedsYouViewTypes'

const RunNeedsYouContext = createContext<RunNeedsYouActions | undefined>(undefined)

/**
 * Lets a run's sign-off report show its "Needs you" items as cards that can be
 * discussed and settled. Without it the report shows them as a plain list.
 */
export function RunNeedsYouProvider({
  value,
  children,
}: {
  value: RunNeedsYouActions
  children: ReactNode
}) {
  return <RunNeedsYouContext.Provider value={value}>{children}</RunNeedsYouContext.Provider>
}

/** The actions a run's "Needs you" cards take, or `undefined` outside a run's sign-off. */
export function useRunNeedsYou(): RunNeedsYouActions | undefined {
  return useContext(RunNeedsYouContext)
}
