import type { DeliverySettings } from 'thefactory-tools/types'
import { client } from './generated/client.gen'

/**
 * Set a group's delivery settings, or clear them with `null`. Written by hand
 * until the SDK is generated from the group route that takes them.
 */
export async function saveGroupDelivery(
  groupId: string,
  delivery: DeliverySettings | null,
): Promise<void> {
  await client.patch({
    url: `/api/v1/projects-groups/${encodeURIComponent(groupId)}`,
    body: { delivery },
    headers: { 'Content-Type': 'application/json' },
    throwOnError: true,
  })
}
