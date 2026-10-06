import { createContext, useContext, type ReactNode } from 'react'

/** Opens the run's own chat with a draft in its composer, for the person to edit and send. */
export type OpenRunChatDraft = (draft: string) => void

const RunChatDraftContext = createContext<OpenRunChatDraft | undefined>(undefined)

/**
 * Lets anything inside a run's pipeline — its sign-off, a step's panel — open
 * the run's own chat with a draft. Without it those surfaces have no run chat.
 */
export function RunChatDraftProvider({
  value,
  children,
}: {
  value: OpenRunChatDraft
  children: ReactNode
}) {
  return <RunChatDraftContext.Provider value={value}>{children}</RunChatDraftContext.Provider>
}

/** Opens the run's chat with a draft, or `undefined` outside a run that has a chat. */
export function useRunChatDraft(): OpenRunChatDraft | undefined {
  return useContext(RunChatDraftContext)
}
