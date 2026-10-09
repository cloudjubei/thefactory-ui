import { createContext, useContext, type ReactNode } from 'react'
import type { DesignHost } from './designNativeTypes'

const EMPTY: DesignHost = {}

const DesignHostContext = createContext<DesignHost>(EMPTY)

/**
 * Hands the design views the app's web view, PDF view and safe-area insets.
 * Mounted once above the `OverlayProvider`, so the viewers a chip or a row
 * opens read it too.
 */
export function DesignHostProvider({
  value,
  children,
}: {
  value: DesignHost
  children: ReactNode
}) {
  return <DesignHostContext.Provider value={value}>{children}</DesignHostContext.Provider>
}

/** The app's {@link DesignHost}; empty when none is mounted. */
export function useDesignHost(): DesignHost {
  return useContext(DesignHostContext)
}
