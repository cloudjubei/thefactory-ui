import { LOOM_WALKTHROUGH_TEXT } from '../utils/runWalkthroughConstants'
import type { RunWalkthroughItem } from '../utils/runWalkthroughTypes'
import type { ChatAttachmentFile, SendFileFromUri } from './chatAttachmentUploadTypes'
import { errorStatus, extractErrorMessage } from './errorMessage'
import { client } from './generated/client.gen'

const FILE_MEDIA_TYPE = 'application/octet-stream'

/** A refused or broken upload. `status` is absent when the backend never answered. */
export class RunWalkthroughFileError extends Error {
  readonly status: number | undefined

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'RunWalkthroughFileError'
    this.status = status
  }
}

const walkthroughUrl = (runId: string): string =>
  `/api/v1/process-runs/${encodeURIComponent(runId)}/walkthrough`

const itemUrl = (runId: string, itemId: string): string =>
  `${walkthroughUrl(runId)}/${encodeURIComponent(itemId)}`

/** What a person records for a run. Written by hand until the SDK is generated from these routes. */
export async function readRunWalkthrough(runId: string): Promise<RunWalkthroughItem[]> {
  const { data } = await client.get({ url: walkthroughUrl(runId), throwOnError: true })
  return data as RunWalkthroughItem[]
}

export async function attachRunWalkthroughLink(
  runId: string,
  itemId: string,
  url: string,
): Promise<RunWalkthroughItem> {
  const { data } = await client.post({
    url: `${itemUrl(runId, itemId)}/link`,
    body: { url },
    headers: { 'Content-Type': 'application/json' },
    throwOnError: true,
  })
  return data as RunWalkthroughItem
}

export type AttachRunWalkthroughFileOptions = {
  apiBaseUrl: string | null
  token: string | null
  sendFileFromUri: SendFileFromUri | undefined
  onProgress?: (sentBytes: number, totalBytes: number | undefined) => void
}

function refusalReason(body: string): string {
  try {
    const error = (JSON.parse(body) as { error?: unknown }).error
    if (typeof error === 'string' && error.trim()) return error.trim()
  } catch {
    return LOOM_WALKTHROUGH_TEXT.fileFailed
  }
  return LOOM_WALKTHROUGH_TEXT.fileFailed
}

async function sendBlob(
  url: string,
  file: Extract<ChatAttachmentFile, { blob: Blob }>,
  onProgress: AttachRunWalkthroughFileOptions['onProgress'],
): Promise<RunWalkthroughItem> {
  try {
    const { data } = await client.instance.post<RunWalkthroughItem>(url, file.blob, {
      baseURL: client.getConfig().baseURL ?? '',
      headers: { 'Content-Type': FILE_MEDIA_TYPE },
      timeout: 0,
      onUploadProgress: ({ loaded, total }) => onProgress?.(loaded, total ?? file.size),
    })
    return data
  } catch (err) {
    throw new RunWalkthroughFileError(
      extractErrorMessage(err, LOOM_WALKTHROUGH_TEXT.fileFailed),
      errorStatus(err),
    )
  }
}

async function sendFromUri(
  url: string,
  file: Extract<ChatAttachmentFile, { uri: string }>,
  { apiBaseUrl, token, sendFileFromUri, onProgress }: AttachRunWalkthroughFileOptions,
): Promise<RunWalkthroughItem> {
  if (!sendFileFromUri || !apiBaseUrl) {
    throw new RunWalkthroughFileError(LOOM_WALKTHROUGH_TEXT.noUriSender, 0)
  }
  const { status, body } = await sendFileFromUri({
    uri: file.uri,
    url: `${apiBaseUrl.replace(/\/+$/, '')}${url}`,
    headers: {
      'Content-Type': FILE_MEDIA_TYPE,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(onProgress ? { onProgress } : {}),
  })
  if (status < 200 || status >= 300) throw new RunWalkthroughFileError(refusalReason(body), status)
  return JSON.parse(body) as RunWalkthroughItem
}

/**
 * Send a video as the raw request body, so it streams whatever its size. Written
 * by hand beside the generated client, which only knows a JSON body; it rides the
 * same axios instance, so auth and the 401 handling apply.
 */
export function attachRunWalkthroughFile(
  runId: string,
  itemId: string,
  file: ChatAttachmentFile,
  options: AttachRunWalkthroughFileOptions,
): Promise<RunWalkthroughItem> {
  const url = `${itemUrl(runId, itemId)}/file?name=${encodeURIComponent(file.name)}`
  return 'blob' in file ? sendBlob(url, file, options.onProgress) : sendFromUri(url, file, options)
}
