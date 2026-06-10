import { useCallback } from 'react'
import { dispatchProjectDataBridge } from '../api/projectData'
import { dispatchLiveDataBridge } from '../api/liveDataBridge'
import { dispatchAnalysisBridge } from '../api/analysisBridge'
import { dispatchActivitiesBridge } from '../api/activitiesBridge'
import { dispatchAppSettingsBridge } from '../api/appSettingsBridge'
import { useLLMConfigs } from '../contexts/LLMConfigsContext'
import type { BridgeRequest } from '../utils/appBridge'

/**
 * Build the `onBridgeMessage` handler that services an embedded app's
 * `overseer:data.*` (read/write the project's own records), `live-data.read`
 * (its subscribed live data), `analysis.*` (run an analysis job), `activities.*`
 * (start/observe a detached background activity), and `settings.*` (read/write
 * layered user-global + per-app settings) requests against the active project.
 * Each dispatcher returns `undefined` for messages it doesn't own; an unhandled
 * message resolves to `undefined`. Analysis jobs + activities run on the user's
 * active **agent-run** LLM config (selected client-side).
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
      const settings = await dispatchAppSettingsBridge(projectId, req)
      if (settings !== undefined) return settings
      const activities = await dispatchActivitiesBridge(projectId, req, activeAgentRunConfigId ?? undefined)
      if (activities !== undefined) return activities
      return dispatchAnalysisBridge(projectId, req, activeAgentRunConfigId ?? undefined)
    },
    [projectId, activeAgentRunConfigId],
  )
}
