import { useCallback } from 'react'
import { dispatchProjectDataBridge } from '../api/projectData'
import { dispatchLiveDataBridge } from '../api/liveDataBridge'
import type { BridgeRequest } from '../utils/appBridge'

/**
 * Build the `onBridgeMessage` handler that services an embedded app's
 * `overseer:data.*` (read/write the project's own records) and
 * `overseer:live-data.read` (its subscribed live data) requests against the
 * active project. Each dispatcher returns `undefined` for messages it doesn't
 * own; an unhandled message resolves to `undefined` (fire-and-forget).
 */
export function useProjectDataBridge(
  projectId: string | undefined,
): (req: BridgeRequest) => Promise<unknown> {
  return useCallback(
    async (req: BridgeRequest) => {
      const data = await dispatchProjectDataBridge(projectId, req)
      if (data !== undefined) return data
      return dispatchLiveDataBridge(projectId, req)
    },
    [projectId],
  )
}
