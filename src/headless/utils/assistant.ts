import { getChatContextKey, globalChatConversations, isGlobalChat } from 'thefactory-tools/utils'

import { ASSISTANT_COPY, assistantNewRepliesTitle } from './assistantConstants'
import type { AssistantChat, AssistantRow, AssistantRowsInput } from './assistantTypes'
import { chatLastActivityAt, chatMessageCount } from './chatListEntry'
import { navRowIndicator } from './navIndicator'
import type { NavRowIndicator } from './navIndicatorTypes'
import { chatAgentLogin, expiredSignInNames, signInExpiredTitle } from './signInExpiry'
import type { SignInChatRunner, SignInLogins } from './signInExpiryTypes'

function rowTitle(chat: AssistantChat, isNew: boolean): string {
  const stored = chat.title?.trim()
  if (stored) return stored
  return isNew ? ASSISTANT_COPY.newConversation : ASSISTANT_COPY.untitled
}

/**
 * The Assistant's list: its conversations newest first — those archived from
 * it only in the archived view, which stays quiet — each with its title, when
 * it last had a message, and what reaches the person of it. The conversation
 * being started is listed at the top until something is written in it. Pure.
 */
export function assistantConversationRows(input: AssistantRowsInput): AssistantRow[] {
  const { archived, open } = input
  const rows = globalChatConversations(input.chats, archived).map((chat): AssistantRow => {
    const status = input.statusOf(chat)
    const isNew = chatMessageCount(chat) === 0
    const at = chatLastActivityAt(chat)
    const quiet = archived || status.muted
    return {
      key: getChatContextKey(chat.context),
      context: chat.context,
      title: rowTitle(chat, isNew),
      ...(at ? { at } : {}),
      isNew,
      fresh: !archived && status.unreadCount > 0,
      needsYou: quiet ? 0 : status.needsYou,
      running: !archived && status.isThinking,
      hidden: archived,
      muted: status.muted,
    }
  })
  if (archived || !open || !isGlobalChat({ context: open })) return rows
  const openKey = getChatContextKey(open)
  if (rows.some((r) => r.key === openKey)) return rows
  return [
    {
      key: openKey,
      context: open,
      title: ASSISTANT_COPY.newConversation,
      isNew: true,
      fresh: false,
      needsYou: 0,
      running: false,
      hidden: false,
      muted: false,
    },
    ...rows,
  ]
}

/**
 * The expired sign-ins of the conversations an agent replies in or that wait
 * on the person, by name. Pure.
 */
export function assistantExpiredSignIns(
  rows: readonly AssistantRow[],
  chats: readonly (AssistantChat & { cliRunner?: SignInChatRunner | null })[],
  signIns: SignInLogins,
): string[] {
  const live = new Set(rows.filter((r) => r.running || r.needsYou > 0).map((r) => r.key))
  const logins = chats
    .filter((chat) => live.has(getChatContextKey(chat.context)))
    .map((chat) => chatAgentLogin(chat.cliRunner))
  return expiredSignInNames(logins, signIns)
}

/**
 * The Assistant nav item: what waits on the person across its conversations as
 * chat ink, moving while an agent replies — red, and said first, for an
 * expired sign-in they use; else a blue dot for new replies. Pure.
 */
export function assistantNavIndicator(
  rows: readonly AssistantRow[],
  expiredSignIns: readonly string[] = [],
): NavRowIndicator {
  const needsYou = rows.reduce((sum, r) => sum + r.needsYou, 0)
  const fresh = rows.filter((r) => r.fresh).length
  const indicator = navRowIndicator({
    parts: [{ channel: 'chat', count: needsYou }],
    running: rows.some((r) => r.running) ? 'chat' : undefined,
    fresh: [{ channel: 'chat', count: fresh }],
    broke: expiredSignIns.map(signInExpiredTitle),
    rollup: false,
  })
  return indicator.kind === 'dot'
    ? { kind: 'dot', title: assistantNewRepliesTitle(fresh) }
    : indicator
}
