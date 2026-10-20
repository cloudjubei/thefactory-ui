import { createContext, useContext, type ReactNode } from 'react'
import type { MediaHost } from './signoffTypes'

const EMPTY: MediaHost = {}

const MediaHostContext = createContext<MediaHost>(EMPTY)

/**
 * Hands the review surfaces the app's video player. Mounted once above the
 * `OverlayProvider`, so the reviews an overlay opens read it too.
 */
export function MediaHostProvider({ value, children }: { value: MediaHost; children: ReactNode }) {
  return <MediaHostContext.Provider value={value}>{children}</MediaHostContext.Provider>
}

/** The app's {@link MediaHost}; empty when none is mounted. */
export function useMediaHost(): MediaHost {
  return useContext(MediaHostContext)
}
