import { createRunnerPairing, listRunners, removeRunner } from './generated'
import { bridgeMessageName, type BridgeRequest } from '../utils/appBridge'

/**
 * Dispatch an `overseer:runners.*` bridge request on behalf of an embedded app
 * (e.g. the Model Trainer hub pairing/managing its compute runners). Returns
 * `undefined` for messages that aren't `runners.*` so the host can compose
 * other handlers. Runner endpoints are global (not project-scoped) and the
 * bearer credential never leaves the host. The PIN returned by
 * `runners.create-pairing` is short-lived; only the runner's token hash is ever
 * stored server-side.
 */
export async function dispatchRunnersBridge(req: BridgeRequest): Promise<unknown> {
  const name = bridgeMessageName(req.type)
  if (!name.startsWith('runners.')) return undefined

  try {
    switch (name) {
      case 'runners.create-pairing': {
        const res = await createRunnerPairing({ throwOnError: true })
        return res.data
      }
      case 'runners.list': {
        const res = await listRunners({ throwOnError: true })
        return res.data
      }
      case 'runners.remove': {
        const payload = (req.payload ?? {}) as { runnerId?: string }
        if (!payload.runnerId) throw new Error('runners.remove requires a runnerId')
        const res = await removeRunner({ path: { runnerId: payload.runnerId }, throwOnError: true })
        return res.data
      }
      default:
        throw new Error(`Unknown runners bridge op: ${name}`)
    }
  } catch (err) {
    throw runnerError(err)
  }
}

/** Lift the backend's real message out of the axios error (its `.message` is generic). */
function runnerError(err: unknown): Error {
  const e = err as { response?: { data?: { error?: unknown } }; message?: unknown }
  const detail = e?.response?.data?.error
  if (typeof detail === 'string' && detail.trim()) return new Error(detail)
  if (err instanceof Error) return err
  if (typeof e?.message === 'string' && e.message) return new Error(e.message)
  return new Error('Runner request failed')
}
