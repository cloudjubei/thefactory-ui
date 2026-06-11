import {
  abortActivity,
  getActivity,
  listActivities,
  resumeActivity,
  runActivity,
  type RunActivityData,
} from './generated'
import { bridgeMessageName, type BridgeRequest } from '../utils/appBridge'

/**
 * Dispatch an `overseer:activities.*` bridge request on behalf of an embedded app.
 * Returns `undefined` for messages that aren't `activities.*` (so the host can
 * compose other handlers). The bearer credential never leaves the host. Starting
 * an activity is fire-and-forget: the backend runs it detached and returns an
 * `activityId` immediately, so the app survives navigating away; the app observes
 * progress + results by re-reading project records via `data.*`. `cliModel` and
 * `llmConfigId` are mutually exclusive on the wire — when a CLI selection is
 * given it wins and the config id is omitted.
 */
export async function dispatchActivitiesBridge(
  projectId: string | undefined,
  req: BridgeRequest,
  llmConfigId?: string,
  cliModel?: RunActivityData['body']['cliModel'],
): Promise<unknown> {
  const name = bridgeMessageName(req.type)
  if (!name.startsWith('activities.')) return undefined
  if (!projectId) {
    throw new Error('Cannot handle an activities bridge request without an active project')
  }

  switch (name) {
    case 'activities.start': {
      const payload = (req.payload ?? {}) as {
        activityType?: string
        params?: Record<string, unknown>
      }
      if (!payload.activityType) {
        throw new Error('activities.start requires an activityType')
      }
      try {
        const res = await runActivity({
          path: { projectId },
          body: cliModel
            ? { activityType: payload.activityType, cliModel, params: payload.params }
            : { activityType: payload.activityType, llmConfigId, params: payload.params },
          throwOnError: true,
        })
        return res.data
      } catch (err) {
        throw activityError(err)
      }
    }
    case 'activities.list': {
      const res = await listActivities({ path: { projectId }, throwOnError: true })
      return res.data
    }
    case 'activities.get': {
      const payload = (req.payload ?? {}) as { activityId?: string }
      if (!payload.activityId) throw new Error('activities.get requires an activityId')
      const res = await getActivity({ path: { projectId, activityId: payload.activityId }, throwOnError: true })
      return res.data
    }
    case 'activities.abort': {
      const payload = (req.payload ?? {}) as { activityId?: string }
      if (!payload.activityId) throw new Error('activities.abort requires an activityId')
      const res = await abortActivity({ path: { projectId, activityId: payload.activityId }, throwOnError: true })
      return res.data
    }
    case 'activities.resume': {
      const payload = (req.payload ?? {}) as { activityId?: string }
      if (!payload.activityId) throw new Error('activities.resume requires an activityId')
      const res = await resumeActivity({ path: { projectId, activityId: payload.activityId }, throwOnError: true })
      return res.data
    }
    default:
      throw new Error(`Unknown activities bridge op: ${name}`)
  }
}

/**
 * Lift the backend's real message out of the axios error (its `.message` is a
 * generic "status code 500"; the useful cause lives on `response.data.error`).
 */
function activityError(err: unknown): Error {
  const e = err as { response?: { data?: { error?: unknown } }; message?: unknown }
  const detail = e?.response?.data?.error
  if (typeof detail === 'string' && detail.trim()) return new Error(detail)
  if (err instanceof Error) return err
  if (typeof e?.message === 'string' && e.message) return new Error(e.message)
  return new Error('Activity request failed')
}
