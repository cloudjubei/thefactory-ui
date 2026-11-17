import { processDeliveryPath } from '../utils/processDelivery'
import type {
  ProcessDeliveryData,
  ProcessDeliveryTarget,
  ProcessGroupPublishBody,
  ProcessPublishBody,
} from '../utils/processDeliveryTypes'
import { client } from './generated/client.gen'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

const deliveryUrl = (target: ProcessDeliveryTarget): string =>
  `/api/v1${processDeliveryPath(target)}/delivery`

/** A run's or a group run's delivery. Written by hand until the SDK is generated from these routes. */
export async function readProcessDelivery(
  target: ProcessDeliveryTarget,
): Promise<ProcessDeliveryData> {
  const { data } = await client.get({ url: deliveryUrl(target), throwOnError: true })
  return data as ProcessDeliveryData
}

/** Keep the publish card's edits; the answer is the delivery with them. */
export async function saveProcessPublishEdits(
  target: ProcessDeliveryTarget,
  body: ProcessPublishBody,
): Promise<ProcessDeliveryData> {
  const { data } = await client.put({
    url: deliveryUrl(target),
    body,
    headers: JSON_HEADERS,
    throwOnError: true,
  })
  return data as ProcessDeliveryData
}

/** Publish every leg of a group run waiting at its publish gate, with the card's edits. */
export async function publishProcessGroup(
  groupRunId: string,
  body: ProcessGroupPublishBody,
): Promise<ProcessDeliveryData> {
  const { data } = await client.post({
    url: `/api/v1${processDeliveryPath({ kind: 'group', groupRunId })}/publish`,
    body,
    headers: JSON_HEADERS,
    throwOnError: true,
  })
  return data as ProcessDeliveryData
}
