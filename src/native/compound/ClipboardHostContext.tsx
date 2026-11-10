import { createContext, useContext, type ReactNode } from 'react'
import type { ClipboardHost } from './clipboardHostTypes'

const EMPTY: ClipboardHost = {}

const ClipboardHostContext = createContext<ClipboardHost>(EMPTY)

/**
 * Hands the shared views the app's clipboard. Mounted once above the
 * `OverlayProvider`, so the sheets a chip opens read it too.
 */
export function ClipboardHostProvider({
  value,
  children,
}: {
  value: ClipboardHost
  children: ReactNode
}) {
  return <ClipboardHostContext.Provider value={value}>{children}</ClipboardHostContext.Provider>
}

/** The app's {@link ClipboardHost}; empty when none is mounted. */
export function useClipboardHost(): ClipboardHost {
  return useContext(ClipboardHostContext)
}
