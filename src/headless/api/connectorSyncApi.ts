import type { ConnectorItemIdentity, ConnectorNewItems } from '../utils/connectorNewItemsTypes'
import { client } from './generated/client.gen'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

/** Every ticket connection's new-item counts. Written by hand until the SDK is generated from these routes. */
export async function listConnectionNewItems(): Promise<ConnectorNewItems[]> {
  const { data } = await client.get({
    url: '/api/v1/provider-connections/new-items',
    throwOnError: true,
  })
  return data as ConnectorNewItems[]
}

/** Mark the items a listing showed as seen, under the identity they were listed under. */
export async function markConnectionItemsSeen(
  connectionId: string,
  identityEpoch: string,
  items: ConnectorItemIdentity[],
): Promise<ConnectorNewItems> {
  const { data } = await client.post({
    url: `/api/v1/provider-connections/${encodeURIComponent(connectionId)}/seen`,
    body: { identityEpoch, items },
    headers: JSON_HEADERS,
    throwOnError: true,
  })
  return data as ConnectorNewItems
}
