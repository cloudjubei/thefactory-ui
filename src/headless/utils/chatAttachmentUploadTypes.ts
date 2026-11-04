import type { ChatAttachmentFile } from '../api/chatAttachmentUploadTypes'

export type ChatAttachmentUploadStatus = 'uploading' | 'failed'

/** A file on its way into a chat's composer, or one that did not get there. */
export type ChatAttachmentUpload = {
  id: string
  name: string
  status: ChatAttachmentUploadStatus
  sizeBytes?: number
  sentBytes: number
  percent: number
  /** How long it should still take, once there is a speed to go on. */
  secondsLeft?: number
  /** Why it did not get there, in words for the person. */
  error?: string
  /** Sending it again could work: not over the limit, not refused for its size. */
  canRetry: boolean
}

/** The running speed of an upload. */
export type UploadRate = {
  atMs: number
  sentBytes: number
  bytesPerSecond?: number
}

/** One chat's uploads, kept above the chat: they go on while the person is in another one. */
export type ChatUploads = {
  subscribe: (listener: () => void) => () => void
  getUploads: () => readonly ChatAttachmentUpload[]
  /** `onAttached` hears of each file as its path joins the composer. */
  attach: (
    files: readonly ChatAttachmentFile[],
    onAttached?: (path: string, file: ChatAttachmentFile) => void,
  ) => void
  /** Stop an upload under way; the file is dropped. */
  stop: (id: string) => void
  dismiss: (id: string) => void
  retry: (id: string) => void
}

/** The strip's words for one upload. */
export type ChatUploadLine = {
  progress: string
  timeLeft?: string
}
