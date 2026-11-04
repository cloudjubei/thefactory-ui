import type {
  ChatAttachmentFile,
  ChatAttachmentUploadOptions,
  SendFileFromUri,
} from './chatAttachmentUploadTypes'
import { errorStatus, extractErrorMessage } from './errorMessage'
import { client } from './generated/client.gen'
import type { ChatContext } from './generated'
import {
  CHAT_ATTACHMENT_UPLOAD_MEDIA_TYPE,
  CHAT_UPLOAD_TEXT,
} from '../utils/chatAttachmentUploadConstants'

/** A refused or broken upload. `status` is absent when the backend never answered. */
export class ChatAttachmentUploadError extends Error {
  readonly status: number | undefined

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ChatAttachmentUploadError'
    this.status = status
  }
}

/** The route and query that take a file for this chat: a project chat's is on its project. */
export function chatAttachmentUploadUrl(context: ChatContext, name: string): string {
  const path = context.projectId
    ? `/api/v1/projects/${encodeURIComponent(context.projectId)}/chat-attachments`
    : '/api/v1/chat-attachments'
  const contextJson = encodeURIComponent(JSON.stringify(context))
  return `${path}?name=${encodeURIComponent(name)}&context=${contextJson}`
}

function uploadedPath(body: string): string {
  const path = (JSON.parse(body) as { path?: unknown }).path
  if (typeof path !== 'string') throw new ChatAttachmentUploadError(CHAT_UPLOAD_TEXT.failed)
  return path
}

function refusalReason(body: string): string {
  try {
    const error = (JSON.parse(body) as { error?: unknown }).error
    if (typeof error === 'string' && error.trim()) return error.trim()
  } catch {
    return CHAT_UPLOAD_TEXT.failed
  }
  return CHAT_UPLOAD_TEXT.failed
}

async function sendBlob(
  url: string,
  file: Extract<ChatAttachmentFile, { blob: Blob }>,
  { onProgress, signal }: ChatAttachmentUploadOptions,
): Promise<string> {
  try {
    const { data } = await client.instance.post<{ path: string }>(url, file.blob, {
      baseURL: client.getConfig().baseURL ?? '',
      headers: { 'Content-Type': CHAT_ATTACHMENT_UPLOAD_MEDIA_TYPE },
      timeout: 0,
      ...(signal ? { signal } : {}),
      onUploadProgress: ({ loaded, total }) => onProgress?.(loaded, total ?? file.size),
    })
    return data.path
  } catch (err) {
    throw new ChatAttachmentUploadError(
      extractErrorMessage(err, CHAT_UPLOAD_TEXT.failed),
      errorStatus(err),
    )
  }
}

type SendFromUriInput = {
  url: string
  file: Extract<ChatAttachmentFile, { uri: string }>
  options: ChatAttachmentUploadOptions
  apiBaseUrl: string | null
  token: string | null
  sendFileFromUri: SendFileFromUri | undefined
}

async function sendFromUri({
  url,
  file,
  options: { onProgress, signal },
  apiBaseUrl,
  token,
  sendFileFromUri,
}: SendFromUriInput): Promise<string> {
  if (!sendFileFromUri || !apiBaseUrl) {
    throw new ChatAttachmentUploadError(CHAT_UPLOAD_TEXT.noUriSender, 0)
  }
  const { status, body } = await sendFileFromUri({
    uri: file.uri,
    url: `${apiBaseUrl.replace(/\/+$/, '')}${url}`,
    headers: {
      'Content-Type': CHAT_ATTACHMENT_UPLOAD_MEDIA_TYPE,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(onProgress ? { onProgress } : {}),
    ...(signal ? { signal } : {}),
  })
  if (status < 200 || status >= 300) {
    throw new ChatAttachmentUploadError(refusalReason(body), status)
  }
  return uploadedPath(body)
}

export type SendChatAttachmentInput = {
  context: ChatContext
  file: ChatAttachmentFile
  options?: ChatAttachmentUploadOptions
  apiBaseUrl: string | null
  token: string | null
  sendFileFromUri: SendFileFromUri | undefined
}

/**
 * Send a file to a chat as the raw request body, so it streams whatever its
 * size. Written by hand beside the generated client, which only knows a JSON
 * body; it rides the same axios instance, so auth and the 401 handling apply.
 */
export function sendChatAttachment({
  context,
  file,
  options = {},
  apiBaseUrl,
  token,
  sendFileFromUri,
}: SendChatAttachmentInput): Promise<string> {
  const url = chatAttachmentUploadUrl(context, file.name)
  if ('blob' in file) return sendBlob(url, file, options)
  return sendFromUri({ url, file, options, apiBaseUrl, token, sendFileFromUri })
}
