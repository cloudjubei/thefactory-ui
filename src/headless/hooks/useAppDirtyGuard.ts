import { useCallback, useState } from 'react'
import { useLeaveBlocker } from '../contexts/LeaveGuardContext'
import type { BridgeRequest } from '../utils/appBridge'
import { appDirtyLeaveMessage, isAppDirtyRequest, parseAppDirtyPayload } from '../utils/appDirty'
import type { AppDirtyPayload } from '../utils/appDirtyTypes'

export interface UseAppDirtyGuard {
  /** The question asked before leaving, while the embedded app reports unsaved changes; else `null`. */
  message: string | null
  /** Consumes an `overseer:app.dirty` request (returns `true`); any other request returns `false`. */
  handleBridgeMessage: (req: BridgeRequest) => boolean
}

/**
 * Tracks an embedded app's unsaved state (`overseer:app.dirty`) and blocks leaving the App view
 * through the shell's {@link LeaveGuardProvider} while it is dirty. `mountKey` names the mounted app
 * (project + surface URL + remount key): a new value starts clean.
 */
export function useAppDirtyGuard(mountKey: string): UseAppDirtyGuard {
  const [entry, setEntry] = useState<{ mountKey: string; state: AppDirtyPayload } | null>(null)
  const state = entry && entry.mountKey === mountKey ? entry.state : null
  const message = appDirtyLeaveMessage(state)
  useLeaveBlocker(message)

  const handleBridgeMessage = useCallback(
    (req: BridgeRequest) => {
      if (!isAppDirtyRequest(req)) return false
      const next = parseAppDirtyPayload(req.payload)
      if (next) setEntry({ mountKey, state: next })
      return true
    },
    [mountKey],
  )

  return { message, handleBridgeMessage }
}
