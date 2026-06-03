import { readProjectLiveData, type SubscribedRecords } from './generated'
import { bridgeMessageName, type BridgeRequest } from '../utils/appBridge'

/**
 * Dispatch an `overseer:live-data.*` bridge request on behalf of an embedded
 * app. Returns `undefined` for messages that aren't `live-data.*` (so the host
 * can compose other handlers). The bearer credential never leaves the host.
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
    case 'live-data.read': {
      const res = await readProjectLiveData({ path: { projectId }, throwOnError: true })
      return (res.data ?? []) as SubscribedRecords[]
    }
    default:
      throw new Error(`Unknown live-data bridge op: ${name}`)
  }
}
