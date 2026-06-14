import { listProjects } from './generated'
import { bridgeMessageName, type BridgeRequest } from '../utils/appBridge'

/**
 * Dispatch an `overseer:projects.*` bridge request for an embedded app — currently `projects.list`,
 * which an app (e.g. the knowledge viewer's sibling-repo picker) uses to enumerate the backend-managed
 * projects it may target. Returns `undefined` for messages that aren't `projects.*` so the host can
 * compose other handlers. Endpoints are global (not project-scoped) and the bearer credential never
 * leaves the host.
 */
export async function dispatchProjectsBridge(req: BridgeRequest): Promise<unknown> {
  const name = bridgeMessageName(req.type)
  if (!name.startsWith('projects.')) return undefined

  try {
    switch (name) {
      case 'projects.list': {
        const res = await listProjects({ throwOnError: true })
        return res.data
      }
      default:
        throw new Error(`Unknown projects bridge op: ${name}`)
    }
  } catch (err) {
    throw projectsError(err)
  }
}

/** Lift the backend's real message out of the axios error (its `.message` is generic). */
function projectsError(err: unknown): Error {
  const e = err as { response?: { data?: { error?: unknown } }; message?: unknown }
  const detail = e?.response?.data?.error
  if (typeof detail === 'string' && detail.trim()) return new Error(detail)
  if (err instanceof Error) return err
  if (typeof e?.message === 'string' && e.message) return new Error(e.message)
  return new Error('Projects request failed')
}
