/**
 * `localStorage`-backed binding for the headless {@link useAppLastOpened} hook — the per-project
 * "last opened the app tab" timestamp the unseen-results badge counts against. Web + desktop
 * renderer share this; mobile has a native-storage peer mirroring the surface. The pure hook
 * lives in `thefactory-ui/headless`; this file is the browser wiring only.
 */

import {
  useAppLastOpened as useAppLastOpenedHeadless,
  type AppLastOpenedStore,
  type UseAppLastOpenedApi,
} from '../../../headless/hooks/useAppLastOpened'

const LS_PREFIX = 'app:last-opened:'
const EVT_KEY = 'app-last-opened-changed'

function lsKey(projectId: string) {
  return `${LS_PREFIX}${projectId}`
}

const STORE: AppLastOpenedStore = {
  getLastOpened: (projectId: string) => {
    try {
      return window.localStorage.getItem(lsKey(projectId)) || undefined
    } catch {
      return undefined
    }
  },
  setLastOpened: (projectId: string, iso: string) => {
    try {
      window.localStorage.setItem(lsKey(projectId), iso)
      // `storage` doesn't fire in the originating document — dispatch a same-doc event too.
      window.dispatchEvent(new CustomEvent(EVT_KEY, { detail: { projectId, iso } }))
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

export function useAppTabLastOpened(projectId: string | undefined): UseAppLastOpenedApi {
  return useAppLastOpenedHeadless(projectId, STORE)
}
