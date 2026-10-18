import {
  listDataSources,
  listProjectDataSources,
  listSourceRecords,
  readProjectLiveData,
  refreshDataSource,
  updateDataSource,
  type DataSource,
  type RefreshResult,
} from './generated'
import { extractErrorMessage } from './errorMessage'
import { bridgeMessageName, type BridgeRequest } from '../utils/appBridge'
import {
  LIVE_DATA_READ_MESSAGE,
  LIVE_DATA_REFRESH_MESSAGE,
  LIVE_DATA_SCHEDULE_MESSAGE,
} from '../utils/appBridgeConstants'
import {
  appLiveDataEntry,
  appSourceNotFound,
  declaredSourceId,
  findAppSource,
  parseAppSchedulePayload,
  parseAppSourceId,
  schedulePatch,
  withSourceSchedules,
} from '../utils/appLiveData'
import { APP_LIVE_DATA_FAILED, APP_SOURCE_ID_REQUIRED } from '../utils/appLiveDataConstants'
import type { AppLiveDataEntry } from '../utils/appLiveDataTypes'

/**
 * Dispatch an `overseer:live-data.*` bridge request on behalf of an embedded app.
 * Returns `undefined` for messages that aren't `live-data.*` (so the host can compose
 * other handlers). An app names its project's sources by the id its `package.json`
 * declares; the host maps it to the stored `<projectId>:<id>` and refuses any source
 * the project does not own. The bearer credential never leaves the host.
 */
export async function dispatchLiveDataBridge(
  projectId: string | undefined,
  req: BridgeRequest,
): Promise<unknown> {
  const name = bridgeMessageName(req.type)
  if (!name.startsWith('live-data.')) return undefined
  if (!projectId) {
    throw new Error('Cannot handle a live-data bridge request without an active project')
  }

  switch (name) {
    case LIVE_DATA_READ_MESSAGE: {
      const sourceId = parseAppSourceId(req.payload)
      return sourceId ? readOne(projectId, sourceId) : readSubscribed(projectId)
    }
    case LIVE_DATA_REFRESH_MESSAGE: {
      const sourceId = parseAppSourceId(req.payload)
      if (!sourceId) throw new Error(APP_SOURCE_ID_REQUIRED)
      return liveDataCall(async () => {
        const source = await requireAppSource(projectId, sourceId)
        const res = await refreshDataSource({ path: { id: source.id }, throwOnError: true })
        const result = res.data as RefreshResult
        return { ...result, sourceId: declaredSourceId(projectId, result.sourceId) }
      })
    }
    case LIVE_DATA_SCHEDULE_MESSAGE: {
      const schedule = parseAppSchedulePayload(req.payload)
      if ('error' in schedule) throw new Error(schedule.error)
      return liveDataCall(async () => {
        const source = await requireAppSource(projectId, schedule.sourceId)
        const res = await updateDataSource({
          path: { id: source.id },
          body: schedulePatch(schedule),
          throwOnError: true,
        })
        const updated = res.data as DataSource
        return { autoUpdate: updated.autoUpdate, freshnessMs: updated.freshness }
      })
    }
    default:
      throw new Error(`Unknown live-data bridge op: ${name}`)
  }
}

async function readSubscribed(projectId: string): Promise<AppLiveDataEntry[]> {
  return liveDataCall(async () => {
    const [subscribed, sources] = await Promise.all([
      readProjectLiveData({ path: { projectId }, throwOnError: true }),
      listDataSources({ throwOnError: true }),
    ])
    return withSourceSchedules(subscribed.data ?? [], (sources.data ?? []) as DataSource[])
  })
}

async function readOne(projectId: string, sourceId: string): Promise<AppLiveDataEntry[]> {
  return liveDataCall(async () => {
    const source = await requireAppSource(projectId, sourceId)
    const res = await listSourceRecords({ path: { id: source.id }, throwOnError: true })
    return [appLiveDataEntry(projectId, source, res.data ?? [])]
  })
}

async function requireAppSource(projectId: string, sourceId: string): Promise<DataSource> {
  const res = await listProjectDataSources({ path: { projectId }, throwOnError: true })
  const source = findAppSource(projectId, (res.data ?? []) as DataSource[], sourceId)
  if (!source) throw new Error(appSourceNotFound(sourceId))
  return source
}

async function liveDataCall<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call()
  } catch (err) {
    throw new Error(extractErrorMessage(err, APP_LIVE_DATA_FAILED))
  }
}
