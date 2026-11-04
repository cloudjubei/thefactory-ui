import type {
  GroupSignOffData,
  GroupSignOffDecisionBody,
  SignOffOutputDocument,
} from '../utils/groupSignOffTypes'
import { client } from './generated/client.gen'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

const groupRunUrl = (groupRunId: string): string =>
  `/api/v1/process-group-runs/${encodeURIComponent(groupRunId)}`

const signOffUrl = (groupRunId: string): string => `${groupRunUrl(groupRunId)}/sign-off`

const outputUrl = (groupRunId: string, evidenceId: string): string =>
  `${groupRunUrl(groupRunId)}/outputs/${encodeURIComponent(evidenceId)}`

/** A group run's one sign-off. Written by hand until the SDK is generated from these routes. */
export async function readGroupSignOff(groupRunId: string): Promise<GroupSignOffData> {
  const { data } = await client.get({ url: signOffUrl(groupRunId), throwOnError: true })
  return data as GroupSignOffData
}

export async function decideGroupSignOff(
  groupRunId: string,
  body: GroupSignOffDecisionBody,
): Promise<GroupSignOffData> {
  const { data } = await client.post({
    url: signOffUrl(groupRunId),
    body,
    headers: JSON_HEADERS,
    throwOnError: true,
  })
  return data as GroupSignOffData
}

/** Try again what failed of an approved sign-off. */
export async function retryGroupSignOff(groupRunId: string): Promise<GroupSignOffData> {
  const { data } = await client.post({
    url: `${signOffUrl(groupRunId)}/retry`,
    throwOnError: true,
  })
  return data as GroupSignOffData
}

export async function readSignOffOutput(
  groupRunId: string,
  evidenceId: string,
): Promise<SignOffOutputDocument> {
  const { data } = await client.get({ url: outputUrl(groupRunId, evidenceId), throwOnError: true })
  return data as SignOffOutputDocument
}

/** Save an edit on the version it started from; the answer is the new version. */
export async function saveSignOffOutput(
  groupRunId: string,
  evidenceId: string,
  text: string,
): Promise<SignOffOutputDocument> {
  const { data } = await client.put({
    url: outputUrl(groupRunId, evidenceId),
    body: { text },
    headers: JSON_HEADERS,
    throwOnError: true,
  })
  return data as SignOffOutputDocument
}

/** An attachment's bytes, through the bearer-authenticated client: a plain link would be refused. */
export async function readSignOffAttachment(downloadPath: string): Promise<ArrayBuffer> {
  const { data } = await client.instance.get<ArrayBuffer>(`/api/v1${downloadPath}`, {
    baseURL: client.getConfig().baseURL ?? '',
    responseType: 'arraybuffer',
    timeout: 0,
  })
  return data
}
