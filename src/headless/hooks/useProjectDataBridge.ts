import { useCallback } from 'react'
import { dispatchProjectDataBridge } from '../api/projectData'
import { dispatchLiveDataBridge } from '../api/liveDataBridge'
import { dispatchAnalysisBridge } from '../api/analysisBridge'
import { useLLMConfigs } from '../contexts/LLMConfigsContext'
import type { BridgeRequest } from '../utils/appBridge'

/**
 * Build the `onBridgeMessage` handler that services an embedded app's
 * `overseer:data.*` (read/write the project's own records), `live-data.read`
 * (its subscribed live data), and `analysis.*` (run an analysis job) requests
 * against the active project. Each dispatcher returns `undefined` for messages
 * it doesn't own; an unhandled message resolves to `undefined`. Analysis jobs
 * run on the user's active **agent-run** LLM config (selected client-side).
 */
export function useProjectDataBridge(
  projectId: string | undefined,
): (req: BridgeRequest) => Promise<unknown> {
  const { activeAgentRunConfigId } = useLLMConfigs()
  return useCallback(
    async (req: BridgeRequest) => {
      const data = await dispatchProjectDataBridge(projectId, req)
      if (data !== undefined) return data
      const live = await dispatchLiveDataBridge(projectId, req)
      if (live !== undefined) return live
      return dispatchAnalysisBridge(projectId, req, activeAgentRunConfigId ?? undefined)
    },
    [projectId, activeAgentRunConfigId],
  )
}
