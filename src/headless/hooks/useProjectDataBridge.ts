import { useCallback } from 'react'
import { dispatchProjectDataBridge } from '../api/projectData'
import { dispatchLiveDataBridge } from '../api/liveDataBridge'
import { dispatchActivitiesBridge } from '../api/activitiesBridge'
import { dispatchAppSettingsBridge } from '../api/appSettingsBridge'
import { dispatchRunnersBridge } from '../api/runnersBridge'
import { dispatchProjectsBridge } from '../api/projectsBridge'
import { useLLMConfigs } from '../contexts/LLMConfigsContext'
import { bridgeMessageName, type BridgeRequest } from '../utils/appBridge'

/**
 * Build the `onBridgeMessage` handler that services an embedded app's
 * `overseer:data.*` (read/write the project's own records), `live-data.read`
 * (its subscribed live data), `analysis.*` (run an analysis job), `activities.*`
 * (start/observe a detached background activity), and `settings.*` (read/write
 * layered user-global + per-app settings) requests against the active project.
 * Each dispatcher returns `undefined` for messages it doesn't own; an unhandled
 * message resolves to `undefined`. Analysis jobs run on the user's active
 * **agent-run** LLM config; activities run on the active **activity** CLI
 * selection when one is set, else the active **activity** config, falling back
 * to the agent-run one until the user picks an activity model (all selected
 * client-side). When `opts.activitiesApiOnly` is set (the embedded app declared
 * its activities are API-only, e.g. knowledge-analyze), the activity CLI model is
 * never sent — those activities run on the API config, matching the chip UI.
 */
export function useProjectDataBridge(
  projectId: string | undefined,
  opts?: { activitiesApiOnly?: boolean; cliActivities?: string[] },
): (req: BridgeRequest) => Promise<unknown> {
  const activitiesApiOnly = opts?.activitiesApiOnly ?? false
  const cliActivities = opts?.cliActivities
  const { activeAgentRunConfigId, activeActivityConfigId, activeActivityCliModel } = useLLMConfigs()
  return useCallback(
    async (req: BridgeRequest) => {
      const data = await dispatchProjectDataBridge(projectId, req)
      if (data !== undefined) return data
      const live = await dispatchLiveDataBridge(projectId, req)
      if (live !== undefined) return live
      const settings = await dispatchAppSettingsBridge(projectId, req)
      if (settings !== undefined) return settings
      // An app can be API-only overall yet allow CLI for SPECIFIC activities (declared via
      // `cliActivities`, e.g. the trainer's `research-training-papers` deep-research). Send the CLI model
      // only when the launched activity permits it; otherwise those activities run on the API config.
      const startType =
        bridgeMessageName(req.type) === 'activities.start'
          ? ((req.payload as { activityType?: string } | undefined)?.activityType ?? undefined)
          : undefined
      const cliAllowed =
        !activitiesApiOnly || (!!startType && !!cliActivities && cliActivities.includes(startType))
      const activities = await dispatchActivitiesBridge(
        projectId,
        req,
        activeActivityConfigId ?? activeAgentRunConfigId ?? undefined,
        cliAllowed ? (activeActivityCliModel ?? undefined) : undefined,
      )
      if (activities !== undefined) return activities
      const runners = await dispatchRunnersBridge(req)
      if (runners !== undefined) return runners
      const projects = await dispatchProjectsBridge(req)
      if (projects !== undefined) return projects
      return undefined
    },
    [
      projectId,
      activeAgentRunConfigId,
      activeActivityConfigId,
      activeActivityCliModel,
      activitiesApiOnly,
      cliActivities,
    ],
  )
}
