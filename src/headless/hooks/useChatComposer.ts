import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react'
import { getChatContextKey } from 'thefactory-tools/utils'
import type { ChatContext } from '../api'
import { useChats } from '../contexts/createChatsContext'
import {
  editPendingMessage,
  enqueueMessage,
  pendingSendNowMode,
  removePendingMessage,
  restoreUnsent,
  takeOutgoing,
  takePending,
  type ChatDraftTake,
} from '../utils/chatDraft'
import type {
  ChatDraft,
  OutgoingChatMessage,
  PendingChatMessage,
  PendingSendNowMode,
} from '../utils/chatDraftTypes'

/** A chat's pending queue, as the composer area shows and drives it. */
export type ChatPendingQueue = {
  items: PendingChatMessage[]
  paused: boolean
  /** What "Send now" does to the running turn in this chat. */
  sendNowMode: PendingSendNowMode
  /** Queue a message sent while the agent is busy; the composer it came from is cleared. */
  enqueue: (message: OutgoingChatMessage) => void
  /** Move a queued message back into the composer. */
  edit: (id: string) => void
  remove: (id: string) => void
  /** Send the whole queue as one message, now. */
  sendNow: () => Promise<void>
  /** Hold the queue for the person (they stopped the turn). */
  pause: () => void
}

export type UseChatComposer = {
  text: string
  attachments: string[]
  setText: (text: string) => void
  setAttachments: (next: string[]) => void
  /**
   * Add an uploaded attachment — to the chat this render belongs to, even when
   * the upload finishes after the person moved to another chat.
   */
  addAttachment: (path: string) => void
  /**
   * Send what the composer holds — after anything still queued, as one
   * message. A send that does not reach the server is put back.
   */
  send: (text: string, attachments?: string[]) => Promise<void>
  queue: ChatPendingQueue
}

export type UseChatComposerOptions = {
  /** Turns what was typed (`#3.2`, `&qa-login`) into what it points at now; applied per message. */
  canonicalize?: (text: string) => string
  /** Fires as a message goes out (e.g. to scroll the list to the bottom). */
  onSent?: () => void
}

let pendingIdSeq = 0
function nextPendingId(): string {
  pendingIdSeq += 1
  return `${Date.now().toString(36)}-${pendingIdSeq}`
}

/**
 * The composer of one chat: its persisted draft (text, attachment chips and
 * the pending queue) and the sends that empty it. Every client's chat surface
 * owns its composer through this, so drafts and queues behave alike on web,
 * desktop and mobile.
 */
export function useChatComposer(
  context: ChatContext,
  options: UseChatComposerOptions = {},
): UseChatComposer {
  const { getDraftState, updateDraftState, subscribeDraft, sendMessage, getChat } = useChats()
  const contextKey = getChatContextKey(context)
  const contextRef = useRef(context)
  contextRef.current = context
  const optionsRef = useRef(options)
  optionsRef.current = options

  const subscribe = useCallback(
    (listener: () => void) => subscribeDraft(contextRef.current, listener),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [subscribeDraft, contextKey],
  )
  const getSnapshot = useCallback(
    () => getDraftState(contextRef.current),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getDraftState, contextKey],
  )
  const draft = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const update = useCallback(
    (fn: (prev: ChatDraft) => ChatDraft) => updateDraftState(contextRef.current, fn),
    [updateDraftState],
  )

  const setText = useCallback(
    (text: string) => update((prev) => (prev.text === text ? prev : { ...prev, text })),
    [update],
  )
  const setAttachments = useCallback(
    (attachments: string[]) => update((prev) => ({ ...prev, attachments })),
    [update],
  )

  const addAttachment = useCallback(
    (path: string) =>
      updateDraftState(context, (prev) =>
        prev.attachments.includes(path)
          ? prev
          : { ...prev, attachments: [...prev.attachments, path] },
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updateDraftState, contextKey],
  )

  const dispatch = useCallback(
    async (take: (prev: ChatDraft) => ChatDraftTake) => {
      const ctx = contextRef.current
      let taken: ChatDraftTake | undefined
      updateDraftState(ctx, (prev) => {
        taken = take(prev)
        return taken.rest
      })
      if (!taken) return
      const { message } = taken
      if (message.text.length === 0 && message.attachments.length === 0) return
      optionsRef.current.onSent?.()
      let delivered = false
      try {
        delivered = await sendMessage(ctx, message.text, message.attachments)
      } catch {
        delivered = false
      }
      if (!delivered) updateDraftState(ctx, (prev) => restoreUnsent(prev, taken!.taken))
    },
    [sendMessage, updateDraftState],
  )

  const canonicalize = useCallback(
    (text: string) => (optionsRef.current.canonicalize ?? ((t: string) => t))(text),
    [],
  )

  const send = useCallback(
    (text: string, attachments?: string[]) =>
      dispatch((prev) =>
        takeOutgoing({ ...prev, text, attachments: attachments ?? [] }, canonicalize),
      ),
    [dispatch, canonicalize],
  )

  const isCliChat = !!getChat(context)?.cliRunner
  const queue = useMemo<ChatPendingQueue>(
    () => ({
      items: draft.pending,
      paused: draft.paused,
      sendNowMode: pendingSendNowMode(isCliChat),
      enqueue: (message) => update((prev) => enqueueMessage(prev, nextPendingId(), message)),
      edit: (id) => update((prev) => editPendingMessage(prev, id)),
      remove: (id) => update((prev) => removePendingMessage(prev, id)),
      sendNow: () => dispatch((prev) => takePending(prev, canonicalize)),
      pause: () =>
        update((prev) =>
          prev.paused || prev.pending.length === 0 ? prev : { ...prev, paused: true },
        ),
    }),
    [draft.pending, draft.paused, isCliChat, update, dispatch, canonicalize],
  )

  return {
    text: draft.text,
    attachments: draft.attachments,
    setText,
    setAttachments,
    addAttachment,
    send,
    queue,
  }
}
