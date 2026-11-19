import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { useOptionalApi } from '../api/ApiContext'
import type { ChatAppNote, ChatContext } from '../api/generated'
import { REMOTE_BROWSER_ROUTES } from '../api/remoteBrowserApi'
import { getChatContextKey } from 'thefactory-tools/utils'
import { RemoteBrowserStore } from '../utils/remoteBrowserStore'
import type {
  RemoteBrowserApi,
  RemoteBrowserSocket,
  RemoteBrowserState,
} from '../utils/remoteBrowserTypes'

export type UseRemoteBrowserOptions = {
  projectId: string
  context: ChatContext
  /** False while the view is closed or hidden: frames stop until it shows again. */
  visible: boolean
  /** Takes each note as it is added, for the chat's composer; without it notes stay staged. */
  onAddNotes?: (notes: ChatAppNote[]) => void
  /** Defaults to the backend's routes. */
  api?: RemoteBrowserApi
  /** Defaults to the app's socket. */
  socket?: RemoteBrowserSocket
  /** Defaults to whether the app's socket is open. */
  connected?: boolean
}

export type UseRemoteBrowserResult = {
  state: RemoteBrowserState
  store: RemoteBrowserStore
}

/**
 * The browsers beside one chat, live while the view shows: one store per chat, started on mount
 * and stopped on unmount, its frames watched only while `visible`.
 */
export function useRemoteBrowser({
  projectId,
  context,
  visible,
  onAddNotes,
  api,
  socket,
  connected,
}: UseRemoteBrowserOptions): UseRemoteBrowserResult {
  const app = useOptionalApi()
  const takeRef = useRef(onAddNotes)
  takeRef.current = onAddNotes
  const usedSocket = socket ?? app?.ws ?? SILENT_SOCKET
  const usedApi = api ?? REMOTE_BROWSER_ROUTES
  const takesNotes = !!onAddNotes
  const chatKey = getChatContextKey(context)
  const store = useMemo(
    () =>
      new RemoteBrowserStore({
        projectId,
        context,
        api: usedApi,
        socket: usedSocket,
        onAddNotes: takesNotes ? (notes) => takeRef.current?.(notes) : undefined,
      }),
    [projectId, chatKey, usedApi, usedSocket, takesNotes],
  )

  useEffect(() => {
    store.start()
    return () => store.stop()
  }, [store])

  useEffect(() => {
    store.setVisible(visible)
  }, [store, visible])

  const open = connected ?? (app ? app.wsState === 'open' : true)
  useEffect(() => {
    store.setConnected(open)
  }, [store, open])

  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState)
  return { state, store }
}

const SILENT_SOCKET: RemoteBrowserSocket = {
  on: () => () => {},
  onReconnect: () => () => {},
  send: () => false,
}
