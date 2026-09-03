import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { StyleSheet, View } from 'react-native'

/**
 * App-level overlay host.
 *
 * Native overlays (`Modal`, `BottomSheet`, `Tooltip`, …) render their visuals
 * into a single host mounted once at the app root instead of into RN's
 * `<Modal>`. RN's `<Modal>` is a real UIKit modal presentation, and iOS
 * refuses to present a second one while the first is still up ("Attempt to
 * present … which is already presenting …"). Routing every overlay through one
 * in-tree host lets any overlay open from inside any other, and lets each
 * animate itself however it likes.
 *
 * `OverlayProvider` must sit above every screen but below the app's data
 * providers, so portalled content can still read those contexts.
 */

interface OverlayEntry {
  id: string
  node: ReactNode
}

interface OverlayContextValue {
  upsert: (id: string, node: ReactNode) => void
  remove: (id: string) => void
}

const OverlayContext = createContext<OverlayContextValue | null>(null)

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<ReadonlyArray<OverlayEntry>>([])

  const upsert = useCallback((id: string, node: ReactNode) => {
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.id === id)
      if (idx === -1) return [...prev, { id, node }]
      const next = prev.slice()
      next[idx] = { id, node }
      return next
    })
  }, [])

  const remove = useCallback((id: string) => {
    setEntries((prev) => (prev.some((e) => e.id === id) ? prev.filter((e) => e.id !== id) : prev))
  }, [])

  const value = useMemo<OverlayContextValue>(() => ({ upsert, remove }), [upsert, remove])

  return (
    <OverlayContext.Provider value={value}>
      {children}
      {entries.length > 0 && (
        // High zIndex so portalled overlays sit above the nav drawer
        // (`nativeZIndex.modal` = 1100) and any other in-tree layered surface.
        <View style={[StyleSheet.absoluteFill, { zIndex: 10000 }]} pointerEvents="box-none">
          {entries.map((entry) => (
            <View key={entry.id} style={StyleSheet.absoluteFill} pointerEvents="box-none">
              {entry.node}
            </View>
          ))}
        </View>
      )}
    </OverlayContext.Provider>
  )
}

/**
 * Teleports `children` into the nearest `OverlayProvider` host. Mount order is
 * z-order — a portal opened later renders above one opened earlier. Renders
 * nothing where it sits in the tree.
 */
export function OverlayPortal({ children }: { children: ReactNode }) {
  const ctx = useContext(OverlayContext)
  const id = useId()

  // Re-publish on every render so the host's copy of the subtree stays fresh.
  useEffect(() => {
    if (ctx) ctx.upsert(id, children)
  })

  // Drop from the host only when the portal itself unmounts.
  useEffect(() => {
    return () => {
      if (ctx) ctx.remove(id)
    }
  }, [ctx, id])

  if (!ctx) {
    throw new Error('OverlayPortal must be rendered inside an OverlayProvider')
  }
  return null
}

/** True when an `OverlayProvider` is mounted above this point in the tree. */
export function useHasOverlayProvider(): boolean {
  return useContext(OverlayContext) != null
}
