import type { ConnectorItemIdentity, ConnectorNewItems } from '../utils/connectorNewItemsTypes'
import {
  listConnectionNewItems as listConnectionNewItemsCall,
  markConnectionItemsSeen as markConnectionItemsSeenCall,
} from './generated'

/** Every ticket connection's new-item counts. */
export async function listConnectionNewItems(): Promise<ConnectorNewItems[]> {
  const { data } = await listConnectionNewItemsCall({ throwOnError: true })
  return data
}

/** Mark the items a listing showed as seen, under the identity they were listed under. */
export async function markConnectionItemsSeen(
  connectionId: string,
  identityEpoch: string,
  items: ConnectorItemIdentity[],
): Promise<ConnectorNewItems> {
  const { data } = await markConnectionItemsSeenCall({
    path: { id: connectionId },
    body: { identityEpoch, items },
    throwOnError: true,
  })
  return data
}
