import type { ChatContext } from 'thefactory-tools/types'

import type { ChatListChat } from './chatListTypes'
import type { ChatRowStatus } from './chatRowStatus'

/** What the Assistant reads of a conversation — a summary or a loaded chat. */
export type AssistantChat = ChatListChat

/** What reaches the person of one conversation, at its notification level. */
export type AssistantRowStatus = Pick<
  ChatRowStatus,
  'isThinking' | 'unreadCount' | 'needsYou' | 'muted'
>

/** One conversation as the Assistant lists it. */
export type AssistantRow = {
  key: string
  context: ChatContext
  title: string
  /** When it last had a message, else when it began. Absent while it is being started. */
  at?: string
  /** Nobody wrote in it yet. */
  isNew: boolean
  /** A reply the person has not read. */
  fresh: boolean
  /** How many things in it wait on the person. */
  needsYou: number
  /** An agent is replying in it. */
  running: boolean
  /** The person archived it from the list. */
  hidden: boolean
  /** The person set it to tell them nothing. */
  muted: boolean
}

/** What the Assistant's list is built from. */
export type AssistantRowsInput = {
  chats: readonly AssistantChat[]
  /** The archived view: the conversations archived from the list. */
  archived: boolean
  /** The conversation on screen — listed at the top while it is being started. */
  open?: ChatContext
  statusOf: (chat: AssistantChat) => AssistantRowStatus
}
