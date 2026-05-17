/**
 * Pure helpers for deriving chat unread state from a snapshot.
 *
 * The persistence of "last read" timestamps is platform-specific (localStorage
 * on web, AsyncStorage on RN, etc.), so the caller passes a `getLastRead`
 * function that returns the ISO timestamp recorded for a given chat key.
 *
 * No DOM, no I/O — the host owns side effects and just exposes a snapshot.
 */

export type UnreadChatMessageLike = {
  role?: string
  completedAt?: string
  startedAt?: string
  createdAt?: string
}

export type ChatLike = {
  key: string
  chat: { messages?: ReadonlyArray<UnreadChatMessageLike> }
}

export type ChatsByProjectId = Record<string, ReadonlyArray<ChatLike>>

function messageTimestamp(msg: UnreadChatMessageLike): string | undefined {
  if (msg.completedAt) return msg.completedAt
  if (msg.startedAt) return msg.startedAt
  if (typeof msg.createdAt === 'string') return msg.createdAt
  return undefined
}

function isAssistant(msg: UnreadChatMessageLike): boolean {
  return msg.role === 'assistant'
}

export function assistantTimestamp(msg: UnreadChatMessageLike): string | undefined {
  if (!isAssistant(msg)) return undefined
  return messageTimestamp(msg)
}

/**
 * Compute the set of chat keys whose latest assistant message is newer than
 * the caller-tracked "last read" timestamp. Chats never opened (no lastRead)
 * count as unread when they contain any assistant message.
 */
export function computeUnreadKeys(
  chatsByProjectId: ChatsByProjectId,
  getLastRead: (chatKey: string) => string | undefined,
): Set<string> {
  const keys = new Set<string>()
  for (const arr of Object.values(chatsByProjectId)) {
    for (const c of arr) {
      const msgs = c.chat.messages ?? []
      let lastAssistantIso: string | undefined
      for (let i = msgs.length - 1; i >= 0; i--) {
        const ts = assistantTimestamp(msgs[i])
        if (ts) {
          lastAssistantIso = ts
          break
        }
      }
      if (!lastAssistantIso) continue
      const lastRead = getLastRead(c.key)
      if (!lastRead || lastAssistantIso.localeCompare(lastRead) > 0) {
        keys.add(c.key)
      }
    }
  }
  return keys
}

export type UnreadCounts = {
  unreadChatsByProject: Map<string, number>
  unreadMessagesByProject: Map<string, number>
}

/** Per-project unread chat count + total unread assistant-message count. */
export function computeUnreadCounts(
  chatsByProjectId: ChatsByProjectId,
  getLastRead: (chatKey: string) => string | undefined,
): UnreadCounts {
  const unreadChats = new Map<string, number>()
  const totalUnread = new Map<string, number>()

  for (const [projectId, arr] of Object.entries(chatsByProjectId)) {
    let chatsCount = 0
    let msgsCount = 0
    for (const c of arr) {
      const msgs = c.chat.messages ?? []
      const assistantMsgs = msgs.filter(isAssistant)
      if (assistantMsgs.length === 0) continue

      const lastRead = getLastRead(c.key)
      if (!lastRead) {
        chatsCount += 1
        msgsCount += assistantMsgs.length
        continue
      }

      let unreadInChat = 0
      for (const m of assistantMsgs) {
        const ts = assistantTimestamp(m)
        if (ts && ts.localeCompare(lastRead) > 0) unreadInChat += 1
      }

      if (unreadInChat > 0) {
        chatsCount += 1
        msgsCount += unreadInChat
      }
    }
    unreadChats.set(projectId, chatsCount)
    totalUnread.set(projectId, msgsCount)
  }
  return { unreadChatsByProject: unreadChats, unreadMessagesByProject: totalUnread }
}

/** How many unread assistant messages in a single chat. */
export function unreadCountForChat(
  chatsByProjectId: ChatsByProjectId,
  chatKey: string,
  getLastRead: (chatKey: string) => string | undefined,
): number {
  for (const arr of Object.values(chatsByProjectId)) {
    for (const c of arr) {
      if (c.key !== chatKey) continue
      const msgs = c.chat.messages ?? []
      const assistantMsgs = msgs.filter(isAssistant)
      if (assistantMsgs.length === 0) return 0
      const lastRead = getLastRead(chatKey)
      if (!lastRead) return assistantMsgs.length
      let count = 0
      for (const m of assistantMsgs) {
        const ts = assistantTimestamp(m)
        if (ts && ts.localeCompare(lastRead) > 0) count += 1
      }
      return count
    }
  }
  return 0
}
