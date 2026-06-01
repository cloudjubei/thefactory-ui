/**
 * `localStorage`-backed binding for the headless `useChatLastRead` hook. Same
 * per-chat "last read" timestamp every per-device app needs (web + desktop
 * renderer) — mobile has its own native-storage peer that mirrors this
 * surface. The pure state-machine and re-render logic live in
 * `thefactory-ui/headless`; this file is the browser wiring only.
 */

import { useMemo } from 'react'
import {
  useChatLastRead as useChatLastReadHeadless,
  type ChatLastReadStore,
  type UseChatLastReadApi as HeadlessApi,
} from '../../../headless/hooks/useChatLastRead'
import { getChatContextKey } from 'thefactory-tools/utils'
import type { ChatContext } from '../../../headless/api'

const LS_PREFIX = 'chat:last-read:'
const EVT_KEY = 'chat-last-read-changed'

function lsKey(chatKey: string) {
  return `${LS_PREFIX}${chatKey}`
}

const STORE: ChatLastReadStore = {
  getLastRead: (chatKey: string) => {
    try {
      return window.localStorage.getItem(lsKey(chatKey)) || undefined
    } catch {
      return undefined
    }
  },
  setLastRead: (chatKey: string, iso: string) => {
    try {
      window.localStorage.setItem(lsKey(chatKey), iso)
      // `storage` event doesn't fire in the originating document, so we
      // dispatch a same-document custom event for other hook instances.
      window.dispatchEvent(new CustomEvent(EVT_KEY, { detail: { chatKey, iso } }))
    } catch {
      /* localStorage unavailable */
    }
  },
  subscribe: (cb) => {
    const onStorage = (ev: StorageEvent) => {
      if (ev.key && ev.key.startsWith(LS_PREFIX)) cb()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener(EVT_KEY, cb as EventListener)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(EVT_KEY, cb as EventListener)
    }
  },
}

export type UseChatContextLastReadApi = {
  lastReadIso: string | undefined
  markReadByKey: HeadlessApi['markReadByKey']
  markReadByContext: (ctx: ChatContext, iso?: string) => void
  getLastReadForKey: HeadlessApi['getLastReadForKey']
}

export function useChatContextLastRead(
  context: ChatContext | undefined,
): UseChatContextLastReadApi {
  const chatKey = useMemo(() => (context ? getChatContextKey(context) : undefined), [context])
  const api = useChatLastReadHeadless({
    chatKey,
    store: STORE,
    contextKey: (ctx) => getChatContextKey(ctx as ChatContext),
  })

  return {
    lastReadIso: api.lastReadIso,
    markReadByKey: api.markReadByKey,
    markReadByContext: (ctx, iso) => api.markReadByContext(ctx, iso),
    getLastReadForKey: api.getLastReadForKey,
  }
}
