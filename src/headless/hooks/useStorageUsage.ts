import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { useApi } from '../api/ApiContext'
import { useAuth } from '../api/AuthContext'
import { refreshStorageTotals, storageTotalsSnapshot, subscribeDesign } from './designStore'
import type { StorageTotalsState } from './designStoreTypes'
import { useOnWsReopen } from './useOnWsReopen'

/**
 * What every project keeps on this machine outside git, and how the total
 * stands against the warning threshold — read on mount, after a design change
 * or a warning, and when the socket comes back.
 */
export function useStorageUsage(): StorageTotalsState & { refresh: () => Promise<void> } {
  const { ws } = useApi()
  const { token } = useAuth()
  const state = useSyncExternalStore(subscribeDesign, storageTotalsSnapshot, storageTotalsSnapshot)
  const refresh = useCallback(() => refreshStorageTotals(), [])

  useEffect(() => {
    if (!token) return
    void refresh()
  }, [token, refresh])
  useOnWsReopen(() => void refresh())
  useEffect(() => {
    const offDesign = ws.on('design:updated', () => void refresh())
    const offWarning = ws.on('storage:usage-warning', () => void refresh())
    return () => {
      offDesign()
      offWarning()
    }
  }, [ws, refresh])

  return { ...state, refresh }
}
