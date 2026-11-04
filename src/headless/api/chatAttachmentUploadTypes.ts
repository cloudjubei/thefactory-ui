import type { ChatContext } from './generated'

/**
 * A file to attach. Web holds its bytes as a `Blob`; native names it by `uri`,
 * so a video is sent from the device and never read into memory.
 */
export type ChatAttachmentFile =
  | { name: string; size: number; blob: Blob }
  | { name: string; size?: number; uri: string }

export type ChatAttachmentUploadOptions = {
  onProgress?: (sentBytes: number, totalBytes: number | undefined) => void
  signal?: AbortSignal
}

/** Sends a file into a chat's attachment store; resolves to the path a message sends. */
export type UploadChatFile = (
  context: ChatContext,
  file: ChatAttachmentFile,
  options?: ChatAttachmentUploadOptions,
) => Promise<string>

export type SendFileFromUriRequest = {
  uri: string
  url: string
  headers: Record<string, string>
  onProgress?: (sentBytes: number, totalBytes: number | undefined) => void
  signal?: AbortSignal
}

export type SendFileFromUriResponse = {
  status: number
  body: string
}

/**
 * How a native app sends a file from its `uri` as the raw request body, with
 * progress. Headless cannot: only the host has a file system.
 */
export type SendFileFromUri = (request: SendFileFromUriRequest) => Promise<SendFileFromUriResponse>
