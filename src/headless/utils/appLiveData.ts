import type { DataRecord, DataSource, DataSourcePatch, SubscribedRecords } from '../api/generated'
import type { DataUpdatedEvent, LiveDataUpdatedEvent } from '../api/sdkTypes'
import { buildBridgePush, type BridgeRequest } from './appBridge'
import { DATA_CHANGED_MESSAGE, LIVE_DATA_CHANGED_MESSAGE } from './appBridgeConstants'
import {
  APP_SCHEDULE_AUTO_UPDATE_REQUIRED,
  APP_SCHEDULE_FRESHNESS_INVALID,
  APP_SOURCE_ID_REQUIRED,
} from './appLiveDataConstants'
import type {
  AppDataChangedPayload,
  AppLiveDataChangedPayload,
  AppLiveDataEntry,
  AppLiveDataSchedule,
  AppLiveDataScheduleRequest,
} from './appLiveDataTypes'

const LIVE_DATA_STATUSES = new Set(['fetching', 'fresh', 'error'])

function sourcePrefix(projectId: string): string {
  return `${projectId}:`
}

/**
 * The stored id of the source an app names: the id its project declares, stored as
 * `<projectId>:<declared id>`. An id already under this project is kept; any other is
 * prefixed, so an app can never name another project's source.
 */
export function projectSourceId(projectId: string, sourceId: string): string {
  const prefix = sourcePrefix(projectId)
  return sourceId.startsWith(prefix) ? sourceId : prefix + sourceId
}

/** The id the project declares for a stored source id, or the id itself when it is not this project's. */
export function declaredSourceId(projectId: string, storedId: string): string {
  const prefix = sourcePrefix(projectId)
  return storedId.startsWith(prefix) ? storedId.slice(prefix.length) : storedId
}

/** The project's own source an app names, or `undefined` when the project declares none by that id. */
export function findAppSource(
  projectId: string,
  sources: readonly DataSource[],
  sourceId: string,
): DataSource | undefined {
  const id = projectSourceId(projectId, sourceId)
  return sources.find((s) => s.id === id && s.projectId === projectId)
}

export function appSourceNotFound(sourceId: string): string {
  return `No live-data source "${sourceId}" in this project.`
}

function payloadRecord(payload: unknown): Record<string, unknown> | null {
  return typeof payload === 'object' && payload !== null && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : null
}

/** The `sourceId` an app sent, trimmed, or `null` when it sent none. */
export function parseAppSourceId(payload: unknown): string | null {
  const value = payloadRecord(payload)?.sourceId
  if (typeof value !== 'string') return null
  const id = value.trim()
  return id ? id : null
}

/** A `live-data.schedule` request, or why it cannot be carried out. */
export function parseAppSchedulePayload(
  payload: unknown,
): AppLiveDataScheduleRequest | { error: string } {
  const sourceId = parseAppSourceId(payload)
  if (!sourceId) return { error: APP_SOURCE_ID_REQUIRED }
  const rec = payloadRecord(payload)!
  if (typeof rec.autoUpdate !== 'boolean') return { error: APP_SCHEDULE_AUTO_UPDATE_REQUIRED }
  if (rec.freshnessMs === undefined) return { sourceId, autoUpdate: rec.autoUpdate }
  const ms = rec.freshnessMs
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) {
    return { error: APP_SCHEDULE_FRESHNESS_INVALID }
  }
  return { sourceId, autoUpdate: rec.autoUpdate, freshnessMs: Math.round(ms) }
}

/** The PATCH a schedule request makes; a task source accepts exactly these fields. */
export function schedulePatch(req: AppLiveDataScheduleRequest): DataSourcePatch {
  return req.freshnessMs === undefined
    ? { autoUpdate: req.autoUpdate }
    : { autoUpdate: req.autoUpdate, freshness: req.freshnessMs }
}

export function appSourceSchedule(source: DataSource): AppLiveDataSchedule {
  return {
    autoUpdate: source.autoUpdate,
    freshnessMs: source.freshness,
    lastRefreshedAt: source.lastRefreshedAt ?? null,
  }
}

/** One project source as `live-data.read {sourceId}` answers it: its declared id, records and schedule. */
export function appLiveDataEntry(
  projectId: string,
  source: DataSource,
  records: DataRecord[],
): AppLiveDataEntry {
  return {
    sourceId: declaredSourceId(projectId, source.id),
    recordType: source.recordType,
    records,
    ...appSourceSchedule(source),
  }
}

/** Every subscribed source's records, each with its source's schedule beside it when the source is known. */
export function withSourceSchedules(
  subscribed: readonly SubscribedRecords[],
  sources: readonly DataSource[],
): AppLiveDataEntry[] {
  const byId = new Map(sources.map((s) => [s.id, s]))
  return subscribed.map((entry) => {
    const source = byId.get(entry.sourceId)
    return source ? { ...entry, ...appSourceSchedule(source) } : { ...entry }
  })
}

/** The `overseer:live-data.changed` push for a WS `liveData:updated` on one of this project's sources, else `null`. */
export function liveDataChangedPush(
  projectId: string,
  event: LiveDataUpdatedEvent,
  at: string,
): BridgeRequest | null {
  const ours =
    event.projectId !== undefined
      ? event.projectId === projectId
      : event.sourceId.startsWith(sourcePrefix(projectId))
  if (!ours || !LIVE_DATA_STATUSES.has(event.status)) return null
  const payload: AppLiveDataChangedPayload = {
    sourceId: declaredSourceId(projectId, event.sourceId),
    status: event.status,
    at,
  }
  return buildBridgePush(LIVE_DATA_CHANGED_MESSAGE, payload)
}

/** The `overseer:data.changed` push for a WS `data:updated` on this project's records, else `null`. */
export function dataChangedPush(projectId: string, event: DataUpdatedEvent): BridgeRequest | null {
  if (event.scope !== projectId) return null
  const payload: AppDataChangedPayload = { collection: event.type }
  return buildBridgePush(DATA_CHANGED_MESSAGE, payload)
}
