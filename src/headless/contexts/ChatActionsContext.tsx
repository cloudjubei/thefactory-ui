import { createContext, useContext, type ReactNode } from 'react'
import type { ResourceLink } from 'thefactory-tools/types'

/** What a card inside a chat's timeline can ask of the chat around it. */
export type ChatActions = {
  /** Opens the review of a turn's changes, or of the chat's open changes when no run is named. */
  openReview: (runId?: string) => void
  /** Puts a draft in the chat's message box, for the person to edit and send. */
  draftMessage: (text: string) => void
  /** The project the chat's runs work in — what a card reads a run's proof and commits from. */
  projectId?: string
  /** The chat's group, for a chat over a group's projects. */
  groupId?: string
  /** The chat's display name — the sender a card for a message to another chat names. */
  chatTitle?: string
  /** Route an in-app `overseer://…` link on a card. */
  onResourceLink?: (link: ResourceLink) => void
}

const ChatActionsContext = createContext<ChatActions | undefined>(undefined)

/**
 * Lets a card in a chat's timeline — a stop card, a changes marker — open the
 * chat's review or draft a message without each host threading callbacks
 * through every message row.
 */
export function ChatActionsProvider({
  value,
  children,
}: {
  value: ChatActions
  children: ReactNode
}) {
  return <ChatActionsContext.Provider value={value}>{children}</ChatActionsContext.Provider>
}

/** The chat's actions, or `undefined` outside a chat body. */
export function useChatActions(): ChatActions | undefined {
  return useContext(ChatActionsContext)
}
