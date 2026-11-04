import { CHAT_ATTACHMENT_MAX_BYTES } from 'thefactory-tools/constants'
import { getChatContextKey } from 'thefactory-tools/utils'
import { ChatAttachmentUploadError } from '../api/chatAttachmentUpload'
import type { ChatAttachmentFile, UploadChatFile } from '../api/chatAttachmentUploadTypes'
import type { ChatContext } from '../api/generated'
import {
  CHAT_UPLOAD_MIN_RATE_WINDOW_MS,
  CHAT_UPLOAD_MIN_REPORT_MS,
  CHAT_UPLOAD_RATE_SMOOTHING,
  CHAT_UPLOAD_TEXT,
} from './chatAttachmentUploadConstants'
import type {
  ChatAttachmentUpload,
  ChatUploadLine,
  ChatUploads,
  UploadRate,
} from './chatAttachmentUploadTypes'
import { attachmentUploadError } from './chatDrop'
import { formatBytes } from './path'

const NO_UPLOADS: readonly ChatAttachmentUpload[] = []
const HTTP_TOO_LARGE = 413

/** The speed after a new sample, smoothed; too soon after the last sample it is left as it was. */
export function nextUploadRate(rate: UploadRate, atMs: number, sentBytes: number): UploadRate {
  const elapsedMs = atMs - rate.atMs
  if (elapsedMs < CHAT_UPLOAD_MIN_RATE_WINDOW_MS) return rate
  const sample = ((sentBytes - rate.sentBytes) / elapsedMs) * 1000
  const bytesPerSecond =
    rate.bytesPerSecond === undefined
      ? sample
      : rate.bytesPerSecond + CHAT_UPLOAD_RATE_SMOOTHING * (sample - rate.bytesPerSecond)
  return { atMs, sentBytes, bytesPerSecond }
}

export function uploadSecondsLeft(
  sentBytes: number,
  totalBytes: number | undefined,
  rate: UploadRate,
): number | undefined {
  if (totalBytes === undefined || !rate.bytesPerSecond) return undefined
  return Math.max(0, (totalBytes - sentBytes) / rate.bytesPerSecond)
}

export function uploadTimeLeftText(seconds: number): string {
  if (seconds < 60) return CHAT_UPLOAD_TEXT.underAMinute
  if (seconds < 3600) return CHAT_UPLOAD_TEXT.minutesLeft(Math.ceil(seconds / 60))
  return CHAT_UPLOAD_TEXT.hoursLeft(Math.ceil(seconds / 3600))
}

/** What the strip says of an upload: how far, and how long is left. */
export function chatUploadLine(upload: ChatAttachmentUpload): ChatUploadLine {
  const sent = formatBytes(upload.sentBytes)
  const total = formatBytes(upload.sizeBytes)
  const progress = total ? `${sent} of ${total} · ${upload.percent}%` : `${upload.percent}%`
  return upload.secondsLeft === undefined
    ? { progress }
    : { progress, timeLeft: uploadTimeLeftText(upload.secondsLeft) }
}

/** A failed file's line where nothing else names it: its name, then why, unless why says it already. */
export function chatUploadFailureText({ name, error }: ChatAttachmentUpload): string {
  if (!error) return name
  return error.includes(name) ? error : `${name}: ${error}`
}

/** Whether any of a chat's files are still on their way, which holds Send. */
export function isChatUploading(uploads: readonly ChatAttachmentUpload[]): boolean {
  return uploads.some((upload) => upload.status === 'uploading')
}

/** A fixed list of uploads that goes nowhere — what a showcase scene or a composer without uploads holds. */
export function fixedChatUploads(uploads: readonly ChatAttachmentUpload[]): ChatUploads {
  return {
    subscribe: () => () => {},
    getUploads: () => uploads,
    attach: () => {},
    stop: () => {},
    dismiss: () => {},
    retry: () => {},
  }
}

type UploadJob = {
  id: string
  chatKey: string
  context: ChatContext
  file: ChatAttachmentFile
  onUploaded: (path: string) => void
  controller?: AbortController
}

/**
 * Every chat's uploads, held above any one composer: a two-gigabyte video takes
 * minutes, and the person moves between chats meanwhile. The file goes on to
 * the chat it was attached to whichever chat is open when it arrives.
 */
export class ChatAttachmentUploadStore {
  private readonly send: UploadChatFile
  private readonly now: () => number
  private readonly byChat = new Map<string, readonly ChatAttachmentUpload[]>()
  private readonly jobs = new Map<string, UploadJob>()
  private readonly listeners = new Map<string, Set<() => void>>()
  private nextId = 0

  constructor(send: UploadChatFile, now: () => number = Date.now) {
    this.send = send
    this.now = now
  }

  /** The handle a composer drives; `addAttachment` puts a finished file's path in that chat's draft. */
  forChat(context: ChatContext, addAttachment: (path: string) => void): ChatUploads {
    const chatKey = getChatContextKey(context)
    return {
      subscribe: (listener) => this.subscribe(chatKey, listener),
      getUploads: () => this.byChat.get(chatKey) ?? NO_UPLOADS,
      attach: (files, onAttached) => {
        for (const file of files) {
          this.start(context, chatKey, file, (path) => {
            addAttachment(path)
            onAttached?.(path, file)
          })
        }
      },
      stop: (id) => this.stop(id),
      dismiss: (id) => this.remove(id),
      retry: (id) => this.retry(id),
    }
  }

  private subscribe(chatKey: string, listener: () => void): () => void {
    const listeners = this.listeners.get(chatKey) ?? new Set()
    listeners.add(listener)
    this.listeners.set(chatKey, listeners)
    return () => {
      listeners.delete(listener)
      if (listeners.size === 0) this.listeners.delete(chatKey)
    }
  }

  private write(
    chatKey: string,
    change: (uploads: readonly ChatAttachmentUpload[]) => readonly ChatAttachmentUpload[],
  ): void {
    const next = change(this.byChat.get(chatKey) ?? NO_UPLOADS)
    if (next.length === 0) this.byChat.delete(chatKey)
    else this.byChat.set(chatKey, next)
    for (const listener of this.listeners.get(chatKey) ?? []) listener()
  }

  private patch(job: UploadJob, fields: Partial<ChatAttachmentUpload>): void {
    this.write(job.chatKey, (uploads) =>
      uploads.map((upload) => (upload.id === job.id ? { ...upload, ...fields } : upload)),
    )
  }

  private start(
    context: ChatContext,
    chatKey: string,
    file: ChatAttachmentFile,
    onUploaded: (path: string) => void,
  ): void {
    this.nextId += 1
    const id = `upload-${this.nextId}`
    const job: UploadJob = { id, chatKey, context, file, onUploaded }
    this.jobs.set(id, job)
    const tooLarge =
      file.size === undefined
        ? undefined
        : attachmentUploadError({ name: file.name, size: file.size }, CHAT_ATTACHMENT_MAX_BYTES)
    const upload: ChatAttachmentUpload = {
      id,
      name: file.name,
      status: tooLarge ? 'failed' : 'uploading',
      ...(file.size !== undefined ? { sizeBytes: file.size } : {}),
      sentBytes: 0,
      percent: 0,
      ...(tooLarge ? { error: tooLarge } : {}),
      canRetry: !tooLarge,
    }
    this.write(chatKey, (uploads) => [...uploads, upload])
    if (!tooLarge) this.run(job)
  }

  private run(job: UploadJob): void {
    const controller = new AbortController()
    job.controller = controller
    let rate: UploadRate = { atMs: this.now(), sentBytes: 0 }
    let reportedAt = 0
    let reachedPercent = 0
    const onProgress = (sentBytes: number, totalBytes: number | undefined): void => {
      const total = totalBytes ?? job.file.size
      const atMs = this.now()
      rate = nextUploadRate(rate, atMs, sentBytes)
      const percent = total ? Math.min(100, Math.floor((sentBytes / total) * 100)) : 0
      reachedPercent = percent
      if (atMs - reportedAt < CHAT_UPLOAD_MIN_REPORT_MS) return
      reportedAt = atMs
      const secondsLeft = uploadSecondsLeft(sentBytes, total, rate)
      this.patch(job, {
        sentBytes,
        percent,
        ...(total !== undefined ? { sizeBytes: total } : {}),
        ...(secondsLeft !== undefined ? { secondsLeft } : {}),
      })
    }
    this.send(job.context, job.file, { signal: controller.signal, onProgress })
      .then((path) => {
        if (!this.jobs.has(job.id)) return
        job.onUploaded(path)
        this.remove(job.id)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || !this.jobs.has(job.id)) return
        const refused = err instanceof ChatAttachmentUploadError ? err.status : undefined
        this.patch(job, {
          status: 'failed',
          error:
            refused === undefined
              ? CHAT_UPLOAD_TEXT.stoppedAt(reachedPercent)
              : (err as Error).message,
          canRetry: refused !== HTTP_TOO_LARGE,
        })
      })
  }

  private stop(id: string): void {
    this.jobs.get(id)?.controller?.abort()
    this.remove(id)
  }

  private remove(id: string): void {
    const job = this.jobs.get(id)
    if (!job) return
    this.jobs.delete(id)
    this.write(job.chatKey, (uploads) => uploads.filter((upload) => upload.id !== id))
  }

  private retry(id: string): void {
    const job = this.jobs.get(id)
    if (!job) return
    this.write(job.chatKey, (uploads) =>
      uploads.map((upload) => {
        if (upload.id !== id) return upload
        const { error: _error, secondsLeft: _left, ...rest } = upload
        return { ...rest, status: 'uploading', sentBytes: 0, percent: 0 }
      }),
    )
    this.run(job)
  }
}
