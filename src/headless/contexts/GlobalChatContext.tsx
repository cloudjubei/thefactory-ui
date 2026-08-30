import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { ChatContext as ChatCtx, GetChatResponse } from '../api'
import { activeGlobalChat, globalChatHistory, newGlobalChatContext } from 'thefactory-tools/utils'
import { useChats } from './createChatsContext'

export type GlobalChatContextValue = {
  /** Context of the conversation the overlay renders. */
  context: ChatCtx
  /** The persisted conversation, or `null` until its first message lands. */
  chat: GetChatResponse | null
  /**
   * Every global conversation, newest first — archived generations included.
   * The data a "past conversations" list needs; nothing renders it yet.
   */
  history: GetChatResponse[]

  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void

  /**
   * Archive the open conversation and start a fresh one. No-op while there is
   * nothing persisted to archive — the surface is already a new conversation.
   */
  reset: () => Promise<void>
  /** True when there is a persisted conversation for {@link reset} to retire. */
  canReset: boolean
  isResetting: boolean
  resetError: Error | null
}

const GlobalChatContext = createContext<GlobalChatContextValue | null>(null)

/**
 * The app-level assistant chat: which `GENERAL` conversation is open, whether
 * its overlay is up, and the reset that retires one generation for another.
 *
 * State lives in a provider rather than a bare hook because the trigger (a
 * sidebar / header button) and the overlay host sit in different subtrees —
 * two `useState` copies would drift. Mount inside `ChatsProvider`, whose chat
 * list this reads.
 */
export function GlobalChatProvider({ children }: { children: ReactNode }) {
  const { chats, archiveChat } = useChats()
  const [isOpen, setIsOpen] = useState(false)
  // The context to fall back on when no un-archived generation exists. Held in
  // state (not minted per render) so the chat key — and with it the draft and
  // live-send state — stays stable until a reset deliberately moves it on.
  const [freshContext, setFreshContext] = useState<ChatCtx>(() => newGlobalChatContext())
  const [isResetting, setIsResetting] = useState(false)
  const [resetError, setResetError] = useState<Error | null>(null)

  const chat = useMemo(() => activeGlobalChat(chats) ?? null, [chats])
  const history = useMemo(() => globalChatHistory(chats), [chats])
  const context = chat?.context ?? freshContext

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((v) => !v), [])

  const reset = useCallback(async () => {
    if (!chat) return
    setResetError(null)
    setIsResetting(true)
    // Mint the next generation before the archive resolves: the instant the
    // archived chat drops out of `activeGlobalChat`, the fallback must already
    // be the new context, or the surface would land back on what it retired.
    setFreshContext(newGlobalChatContext())
    try {
      await archiveChat(chat.context)
    } catch (err) {
      setResetError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsResetting(false)
    }
  }, [chat, archiveChat])

  const value = useMemo<GlobalChatContextValue>(
    () => ({
      context,
      chat,
      history,
      isOpen,
      open,
      close,
      toggle,
      reset,
      canReset: chat !== null,
      isResetting,
      resetError,
    }),
    [context, chat, history, isOpen, open, close, toggle, reset, isResetting, resetError],
  )

  return <GlobalChatContext.Provider value={value}>{children}</GlobalChatContext.Provider>
}

export function useGlobalChat(): GlobalChatContextValue {
  const ctx = useContext(GlobalChatContext)
  if (!ctx) throw new Error('useGlobalChat must be used within GlobalChatProvider')
  return ctx
}
