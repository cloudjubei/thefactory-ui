import { useCallback } from 'react'
import { dispatchProjectDataBridge } from '../api/projectData'
import type { BridgeRequest } from '../utils/appBridge'

/**
 * Build the `onBridgeMessage` handler that services an embedded app's
 * `overseer:data.*` requests against the active project. Non-data messages
 * resolve to `undefined` so the host can compose further handlers.
 */
export function useProjectDataBridge(
  projectId: string | undefined,
): (req: BridgeRequest) => Promise<unknown> {
  return useCallback((req: BridgeRequest) => dispatchProjectDataBridge(projectId, req), [projectId])
}
