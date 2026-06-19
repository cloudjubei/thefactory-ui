import {
  listProjectData,
  countProjectData,
  putProjectData,
  deleteProjectData,
  type DataRecord,
  type ListProjectDataData,
} from './generated'
import type { DataFilter, DataSort } from 'thefactory-tools/types'
import { bridgeMessageName, type BridgeRequest } from '../utils/appBridge'

export interface ProjectDataQuery {
  type?: string
  key?: string
  /** Composable content-field filter (and/or/not + predicates); serialised to the wire as JSON. */
  where?: DataFilter
  /** Content-field ordering terms; serialised to the wire as JSON. */
  orderBy?: DataSort[]
  /** Max records to return — for stable, sorted pagination. */
  limit?: number
  /** Records to skip before `limit` — for paging a sorted result set. */
  offset?: number
}

/** Structured `where`/`orderBy` cross the wire as JSON-encoded query-string params. */
function toListQuery(query: ProjectDataQuery): NonNullable<ListProjectDataData['query']> {
  const q: NonNullable<ListProjectDataData['query']> = {}
  if (query.type !== undefined) q.type = query.type
  if (query.key !== undefined) q.key = query.key
  if (query.where !== undefined) q.where = JSON.stringify(query.where)
  if (query.orderBy !== undefined) q.orderBy = JSON.stringify(query.orderBy)
  if (query.limit !== undefined) q.limit = query.limit
  if (query.offset !== undefined) q.offset = query.offset
  return q
}

export interface ProjectDataPutInput {
  type: string
  key?: string | null
  content: Record<string, unknown> | unknown[]
  metadata?: Record<string, unknown>
}

export interface ProjectDataRef {
  type: string
  key: string
}

/** List a project's records, filtered by `type`/`key`/`where`, ordered by `orderBy`, paginated. */
export async function queryProjectData(
  projectId: string,
  query: ProjectDataQuery = {},
): Promise<DataRecord[]> {
  const res = await listProjectData({
    path: { projectId },
    query: toListQuery(query),
    throwOnError: true,
  })
  return (res.data ?? []) as DataRecord[]
}

/** Count records matching the `type`/`key`/`where` filter — pairs with `queryProjectData` paging. */
export async function countProjectDataRecords(
  projectId: string,
  query: ProjectDataQuery = {},
): Promise<number> {
  const countQuery: { type?: string; key?: string; where?: string } = {}
  if (query.type !== undefined) countQuery.type = query.type
  if (query.key !== undefined) countQuery.key = query.key
  if (query.where !== undefined) countQuery.where = JSON.stringify(query.where)
  const res = await countProjectData({ path: { projectId }, query: countQuery, throwOnError: true })
  return res.data?.count ?? 0
}

/** Upsert a record into a project's scope. A `null`/omitted `key` inserts a keyless record. */
export async function putProjectDataRecord(
  projectId: string,
  input: ProjectDataPutInput,
): Promise<DataRecord> {
  const res = await putProjectData({ path: { projectId }, body: input, throwOnError: true })
  return res.data as DataRecord
}

/** Delete a keyed record from a project's scope. */
export async function deleteProjectDataRecord(
  projectId: string,
  ref: ProjectDataRef,
): Promise<void> {
  await deleteProjectData({ path: { projectId }, query: ref, throwOnError: true })
}

export interface ProjectDataApi {
  query: (query?: ProjectDataQuery) => Promise<DataRecord[]>
  count: (query?: ProjectDataQuery) => Promise<number>
  put: (input: ProjectDataPutInput) => Promise<DataRecord>
  remove: (ref: ProjectDataRef) => Promise<void>
}

/**
 * Bind the data wrappers to a project. `query`/`count` resolve to empty when no project
 * is active (nothing to list); `put`/`remove` reject — a write needs a target.
 */
export function createProjectDataApi(projectId: string | undefined): ProjectDataApi {
  const noProject = () => new Error('projectData: no active project')
  return {
    query: (query = {}) => (projectId ? queryProjectData(projectId, query) : Promise.resolve([])),
    count: (query = {}) =>
      projectId ? countProjectDataRecords(projectId, query) : Promise.resolve(0),
    put: (input) =>
      projectId ? putProjectDataRecord(projectId, input) : Promise.reject(noProject()),
    remove: (ref) =>
      projectId ? deleteProjectDataRecord(projectId, ref) : Promise.reject(noProject()),
  }
}

/**
 * Dispatch an `overseer:data.*` bridge request to the backend on behalf of an
 * embedded app. Returns `undefined` for messages that aren't `data.*` (so the
 * host can compose other handlers); the write credential never leaves the host.
 */
export async function dispatchProjectDataBridge(
  projectId: string | undefined,
  req: BridgeRequest,
): Promise<unknown> {
  const name = bridgeMessageName(req.type)
  if (!name.startsWith('data.')) return undefined
  if (!projectId) throw new Error('Cannot handle a data bridge request without an active project')

  switch (name) {
    case 'data.query': {
      const p = (req.payload ?? {}) as ProjectDataQuery
      return queryProjectData(projectId, {
        type: p.type,
        key: p.key,
        where: p.where,
        orderBy: p.orderBy,
        limit: p.limit,
        offset: p.offset,
      })
    }
    case 'data.count': {
      const p = (req.payload ?? {}) as ProjectDataQuery
      return {
        count: await countProjectDataRecords(projectId, {
          type: p.type,
          key: p.key,
          where: p.where,
        }),
      }
    }
    case 'data.put': {
      const p = (req.payload ?? {}) as Partial<ProjectDataPutInput>
      if (typeof p.type !== 'string' || p.type.length === 0) {
        throw new Error('data.put requires a non-empty `type`')
      }
      if (typeof p.content !== 'object' || p.content === null) {
        throw new Error('data.put requires object or array `content`')
      }
      return putProjectDataRecord(projectId, {
        type: p.type,
        key: p.key ?? null,
        content: p.content,
        metadata: p.metadata,
      })
    }
    case 'data.delete': {
      const p = (req.payload ?? {}) as Partial<ProjectDataRef>
      if (typeof p.type !== 'string' || p.type.length === 0) {
        throw new Error('data.delete requires a non-empty `type`')
      }
      if (typeof p.key !== 'string' || p.key.length === 0) {
        throw new Error('data.delete requires a non-empty `key`')
      }
      await deleteProjectDataRecord(projectId, { type: p.type, key: p.key })
      return { deleted: true }
    }
    default:
      throw new Error(`Unknown data bridge op: ${name}`)
  }
}
