import { useEffect, useSyncExternalStore } from 'react'

import { listCredentialCaptures } from '../api/generated'
import { useApi } from '../api'
import { CREDENTIAL_CAPTURE_EVENT } from '../utils/credentialCaptureConstants'
import { isCredentialCapture } from '../utils/credentialCaptures'
import { signInCardsByChat } from '../utils/signInExpiry'
import type { AgentLogin } from '../utils/signInExpiryTypes'

type WsLike = ReturnType<typeof useApi>['ws']

type SignInCardsStore = {
  cards: ReadonlyMap<string, readonly AgentLogin[]>
  listeners: Set<() => void>
  users: number
  stop?: () => void
}

const EMPTY: ReadonlyMap<string, readonly AgentLogin[]> = new Map()

const stores = new WeakMap<WsLike, SignInCardsStore>()

function storeFor(ws: WsLike): SignInCardsStore {
  let store = stores.get(ws)
  if (!store) {
    store = { cards: EMPTY, listeners: new Set(), users: 0 }
    stores.set(ws, store)
  }
  return store
}

function start(ws: WsLike, store: SignInCardsStore): () => void {
  let disposed = false
  let seq = 0
  const load = async () => {
    const mine = ++seq
    try {
      const { data } = await listCredentialCaptures({ throwOnError: true })
      if (disposed || mine !== seq) return
      store.cards = signInCardsByChat((data ?? []).filter(isCredentialCapture))
      for (const listener of store.listeners) listener()
    } catch {
      return
    }
  }
  void load()
  const off = ws.on(CREDENTIAL_CAPTURE_EVENT, () => void load())
  return () => {
    disposed = true
    off()
  }
}

/**
 * The stored login each chat's open sign-in card signs in again, by chat key —
 * kept live: re-read whenever a card opens or is answered anywhere. Every
 * caller shares one fetch and one subscription. A failed read keeps the last.
 */
export function useSignInCardsByChat(): ReadonlyMap<string, readonly AgentLogin[]> {
  const { ws } = useApi()
  const store = storeFor(ws)
  useEffect(() => {
    store.users += 1
    if (store.users === 1) store.stop = start(ws, store)
    return () => {
      store.users -= 1
      if (store.users === 0) {
        store.stop?.()
        store.stop = undefined
      }
    }
  }, [ws, store])
  return useSyncExternalStore(
    (listener) => {
      store.listeners.add(listener)
      return () => store.listeners.delete(listener)
    },
    () => store.cards,
    () => EMPTY,
  )
}
