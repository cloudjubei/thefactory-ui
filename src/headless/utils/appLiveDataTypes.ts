import type { DataRecord } from '../api/generated'

/** A project source's schedule as an embedded app reads and sets it. */
export interface AppLiveDataSchedule {
  autoUpdate: boolean
  freshnessMs: number
  lastRefreshedAt: string | null
}

/** One source's records as `live-data.read` answers them, with the source's schedule beside them. */
export interface AppLiveDataEntry {
  sourceId: string
  recordType: string
  records: DataRecord[]
  autoUpdate?: boolean
  freshnessMs?: number
  lastRefreshedAt?: string | null
}

/** What an app posts as `live-data.schedule`. */
export interface AppLiveDataScheduleRequest {
  sourceId: string
  autoUpdate: boolean
  freshnessMs?: number
}

/** The `overseer:live-data.changed` push. */
export interface AppLiveDataChangedPayload {
  sourceId: string
  status: 'fetching' | 'fresh' | 'error'
  at: string
}

/** The `overseer:data.changed` push. */
export interface AppDataChangedPayload {
  collection?: string
}
