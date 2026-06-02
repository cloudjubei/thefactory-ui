import { listProjectData, putProjectData, deleteProjectData, type DataRecord } from './generated'
import { bridgeMessageName, type BridgeRequest } from '../utils/appBridge'

export interface ProjectDataQuery {
  type?: string
  key?: string
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

/** List a project's records, optionally filtered by `type` and `key`. */
export async function queryProjectData(
  projectId: string,
  query: ProjectDataQuery = {},
): Promise<DataRecord[]> {
  const res = await listProjectData({ path: { projectId }, query, throwOnError: true })
  return (res.data ?? []) as DataRecord[]
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
      return queryProjectData(projectId, { type: p.type, key: p.key })
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
