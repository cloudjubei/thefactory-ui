import type { ChatAppNoteRect } from '../api/generated'
import type { ChatAttachmentFile, UploadChatFile } from '../api/chatAttachmentUploadTypes'
import { ChatAttachmentUploadError } from '../api/chatAttachmentUpload'
import { nextAppNoteId } from './appNotes'
import type { AppNote } from './appNotesTypes'
import { CHAT_UPLOAD_TEXT } from './chatAttachmentUploadConstants'
import {
  freezeScreenshotLaunch,
  resolveAppRegion,
  resolveEntireImage,
  resolveScreenshotCrop,
  screenshotAreaLabel,
  screenshotBytesError,
  screenshotImageError,
  screenshotNote,
  keptAttachmentPath,
} from './screenshotAnnotation'
import {
  SCREENSHOT_ANNOTATION_IDLE,
  SCREENSHOT_ANNOTATION_TEXT,
} from './screenshotAnnotationConstants'
import type {
  ScreenshotAnnotationSnapshot,
  ScreenshotCaptureAdapter,
  ScreenshotCapturedPixels,
  ScreenshotCropMapping,
  ScreenshotLaunch,
  ScreenshotPixelRect,
  ScreenshotPointRect,
} from './screenshotAnnotationTypes'

const HTTP_TOO_LARGE = 413

type Session = {
  generation: number
  launch: ScreenshotLaunch
  adapter: ScreenshotCaptureAdapter
  upload: UploadChatFile
  onNote: (note: AppNote) => void
  noteIds: () => readonly string[]
  abort: AbortController
  pixels: ScreenshotCapturedPixels | null
  cropped: ScreenshotCapturedPixels | null
  comment: string
  crop: ScreenshotPixelRect | null
  viewport: ChatAppNoteRect | null
  canRetry: boolean
}

/**
 * One screenshot annotation. The launch passed to {@link requestCapture} is
 * the only destination: a later chat switch or app navigation is not read,
 * and a capture or upload that finishes after cancel, unmount or a newer
 * capture is dropped instead of delivered.
 */
export class ScreenshotAnnotationDraft {
  private generation = 0
  private disposed = false
  private session: Session | null = null
  private phase: ScreenshotAnnotationSnapshot['phase'] = 'idle'
  private error: string | null = null
  private unavailableReason: string | null = null
  private snapshot: ScreenshotAnnotationSnapshot = SCREENSHOT_ANNOTATION_IDLE
  private readonly listeners = new Set<() => void>()
  private readonly released = new WeakSet<object>()
  /** Ids this draft has already handed out. A new draft starts empty; the composer's notes fill the gap. */
  private readonly issued = new Set<string>()

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = (): ScreenshotAnnotationSnapshot => this.snapshot

  /** The held capture's file, for the panel's preview. Null once it is released. */
  getPreviewFile = (): ChatAttachmentFile | null => this.session?.pixels?.file ?? null

  /**
   * Person asked to capture. `launch` and `onNote` are frozen for this
   * attempt. An adapter that cannot capture becomes unavailable and takes
   * nothing. A capture already running is released; its result cannot land
   * on this launch. `noteIds` is read when the note is created, so a draft
   * that was disposed and replaced does not reuse an id still on the composer.
   */
  requestCapture(
    launch: ScreenshotLaunch,
    adapter: ScreenshotCaptureAdapter | null,
    upload: UploadChatFile,
    onNote: (note: AppNote) => void,
    noteIds: () => readonly string[] = () => [],
  ): void {
    this.generation += 1
    const generation = this.generation
    this.dropSession()
    if (!adapter || adapter.unavailableReason?.trim()) {
      this.phase = 'unavailable'
      this.unavailableReason =
        adapter?.unavailableReason?.trim() || SCREENSHOT_ANNOTATION_TEXT.noAdapter
      this.error = null
      this.emit()
      return
    }
    const abort = new AbortController()
    const session: Session = {
      generation,
      launch: freezeScreenshotLaunch(launch),
      adapter,
      upload,
      onNote,
      noteIds,
      abort,
      pixels: null,
      cropped: null,
      comment: '',
      crop: null,
      viewport: null,
      canRetry: false,
    }
    this.session = session
    this.phase = 'capturing'
    this.error = null
    this.unavailableReason = null
    this.emit()
    let pending: Promise<ScreenshotCapturedPixels>
    try {
      pending = adapter.capture({ signal: abort.signal })
    } catch (err) {
      pending = Promise.reject(err)
    }
    void pending.then(
      (pixels) => this.onCaptured(generation, adapter, pixels),
      (err: unknown) => this.onCaptureFailed(generation, err),
    )
  }

  setComment(comment: string): void {
    const session = this.session
    if (!session || (this.phase !== 'preview' && this.phase !== 'failed')) return
    session.comment = comment
    this.emit()
  }

  useEntireImage(): void {
    const session = this.session
    if (!session?.pixels || (this.phase !== 'preview' && this.phase !== 'failed')) return
    const resolved = resolveEntireImage({
      source: session.pixels.source,
      appViewport: session.pixels.appViewport,
    })
    if (!resolved.ok) {
      this.error = resolved.reason
      this.emit()
      return
    }
    session.crop = null
    session.viewport = resolved.rect
    this.error = screenshotBytesError(session.pixels.file)
    this.phase = 'preview'
    this.emit()
  }

  useAppRegion(): void {
    const session = this.session
    if (!session?.pixels?.appInImage || (this.phase !== 'preview' && this.phase !== 'failed'))
      return
    const resolved = resolveAppRegion({
      image: session.pixels.image,
      appInImage: session.pixels.appInImage,
      appViewport: session.pixels.appViewport,
    })
    if (!resolved.ok) {
      this.error = resolved.reason
      this.emit()
      return
    }
    session.crop = resolved.imageRect
    session.viewport = resolved.rect
    this.error = null
    this.phase = 'preview'
    this.emit()
  }

  applyCrop(selection: ScreenshotPointRect, mapping: ScreenshotCropMapping): void {
    const session = this.session
    if (!session?.pixels || (this.phase !== 'preview' && this.phase !== 'failed')) return
    const resolved = resolveScreenshotCrop({
      selection,
      mapping,
      source: session.pixels.source,
      appViewport: session.pixels.appViewport,
      appInImage: session.pixels.appInImage,
    })
    if (!resolved.ok) {
      this.error = resolved.reason
      this.emit()
      return
    }
    session.crop = resolved.imageRect
    session.viewport = resolved.rect
    this.error = null
    this.phase = 'preview'
    this.emit()
  }

  /** Upload the frozen image to the frozen chat and hand back the note. Does not send a message. */
  confirm(): void {
    const session = this.session
    if (!session?.pixels || session.generation !== this.generation) return
    if (this.phase !== 'preview' && this.phase !== 'failed') return
    if (session.pixels.source === 'display' && !session.crop) {
      this.error = SCREENSHOT_ANNOTATION_TEXT.needsAppCrop
      this.emit()
      return
    }
    if (!session.viewport) {
      this.error = SCREENSHOT_ANNOTATION_TEXT.appSize
      this.emit()
      return
    }
    if (!session.crop) {
      const tooBig = screenshotBytesError(session.pixels.file)
      if (tooBig) {
        this.fail(session, tooBig, false)
        return
      }
    }
    const generation = session.generation
    const comment = session.comment
    this.phase = 'uploading'
    this.error = null
    this.emit()
    void this.finish(session, generation, comment)
  }

  retry(): void {
    if (this.phase !== 'failed' || !this.session?.canRetry) return
    this.confirm()
  }

  /** Drop the image and release it. The note is not delivered, and nothing moves to another chat. */
  remove(): void {
    if (!this.session?.pixels && this.phase !== 'capturing' && this.phase !== 'uploading') return
    this.abandon()
  }

  /** Stop the capture or upload and release whatever it held. */
  cancel(): void {
    this.abandon()
  }

  /** Unmount. A result that arrives afterwards is released and not delivered. */
  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.abandon()
  }

  private abandon(): void {
    this.generation += 1
    this.dropSession()
    this.phase = 'idle'
    this.error = null
    this.unavailableReason = null
    this.emit()
  }

  private dropSession(): void {
    const session = this.session
    this.session = null
    if (!session) return
    session.abort.abort()
    this.releaseSession(session)
  }

  private onCaptured(
    generation: number,
    adapter: ScreenshotCaptureAdapter,
    pixels: ScreenshotCapturedPixels,
  ): void {
    if (this.stale(generation)) {
      this.releaseOnce(adapter, pixels)
      return
    }
    const session = this.session
    if (!session) {
      this.releaseOnce(adapter, pixels)
      return
    }
    const imageError =
      screenshotImageError(pixels.image) ??
      (pixels.appViewport ? screenshotImageError(pixels.appViewport) : null)
    if (imageError || (pixels.source === 'display' && pixels.appInImage && !pixels.appViewport)) {
      this.releaseOnce(adapter, pixels)
      this.phase = 'idle'
      this.error = imageError ?? SCREENSHOT_ANNOTATION_TEXT.appSize
      this.emit()
      return
    }
    session.pixels = pixels
    this.phase = 'preview'
    this.error = screenshotBytesError(pixels.file)
    if (pixels.source === 'app') {
      const entire = resolveEntireImage({ source: 'app', appViewport: pixels.appViewport })
      if (entire.ok) session.viewport = entire.rect
      else this.error = this.error ?? entire.reason
    }
    this.emit()
  }

  private onCaptureFailed(generation: number, err: unknown): void {
    if (this.stale(generation)) return
    const session = this.session
    session?.abort.abort()
    if (this.session === session) this.session = null
    this.phase = 'idle'
    this.error =
      err instanceof Error && err.message ? err.message : SCREENSHOT_ANNOTATION_TEXT.captureFailed
    this.emit()
  }

  private async finish(session: Session, generation: number, comment: string): Promise<void> {
    const pixels = session.pixels
    if (!pixels || !session.viewport) return
    let file: ChatAttachmentFile = pixels.file
    if (session.crop) {
      this.releaseCropped(session)
      if (!session.adapter.crop) {
        this.fail(session, SCREENSHOT_ANNOTATION_TEXT.cannotCrop, false)
        return
      }
      try {
        const cropped = await session.adapter.crop(pixels, session.crop)
        if (this.stale(generation)) {
          if (cropped !== pixels) this.releaseOnce(session.adapter, cropped)
          return
        }
        session.cropped = cropped
        file = cropped.file
        const croppedError = screenshotBytesError(file)
        if (croppedError) {
          this.releaseCropped(session)
          this.fail(session, croppedError, false)
          return
        }
      } catch (err) {
        if (this.stale(generation)) return
        this.fail(
          session,
          err instanceof Error && err.message ? err.message : SCREENSHOT_ANNOTATION_TEXT.cannotCrop,
          true,
        )
        return
      }
    }
    try {
      const path = await session.upload(session.launch.context, file, {
        signal: session.abort.signal,
      })
      if (this.stale(generation)) return
      const kept = keptAttachmentPath(path)
      if (!kept) {
        this.fail(session, SCREENSHOT_ANNOTATION_TEXT.unusablePath, false)
        return
      }
      const note = screenshotNote({
        id: this.allocateId(session.noteIds()),
        launch: session.launch,
        comment,
        rect: session.viewport,
        screenshotFile: kept,
      })
      const deliver = session.onNote
      this.releaseSession(session)
      if (this.session === session) this.session = null
      if (this.generation === generation) {
        this.generation += 1
        this.phase = 'idle'
        this.error = null
        this.emit()
      }
      deliver(note)
    } catch (err) {
      if (this.stale(generation) || session.abort.signal.aborted) return
      const status = err instanceof ChatAttachmentUploadError ? err.status : undefined
      const message = err instanceof Error && err.message ? err.message : CHAT_UPLOAD_TEXT.failed
      this.fail(session, message, status !== HTTP_TOO_LARGE)
    }
  }

  private fail(session: Session, message: string, canRetry: boolean): void {
    if (this.stale(session.generation) || this.session !== session) return
    session.canRetry = canRetry
    this.phase = 'failed'
    this.error = message
    this.emit()
  }

  private stale(generation: number): boolean {
    return this.disposed || generation !== this.generation
  }

  /** An id none of this composer's notes, and none of this draft's earlier notes, already has. */
  private allocateId(taken: readonly string[]): string {
    const id = nextAppNoteId([...taken, ...this.issued])
    this.issued.add(id)
    return id
  }

  private releaseCropped(session: Session): void {
    if (session.cropped && session.cropped !== session.pixels) {
      this.releaseOnce(session.adapter, session.cropped)
    }
    session.cropped = null
  }

  private releaseSession(session: Session): void {
    this.releaseCropped(session)
    if (session.pixels) this.releaseOnce(session.adapter, session.pixels)
    session.pixels = null
  }

  private releaseOnce(adapter: ScreenshotCaptureAdapter, pixels: ScreenshotCapturedPixels): void {
    if (this.released.has(pixels)) return
    this.released.add(pixels)
    adapter.release(pixels)
  }

  private emit(): void {
    this.snapshot = this.build()
    for (const listener of this.listeners) listener()
  }

  private build(): ScreenshotAnnotationSnapshot {
    const session = this.session
    const pixels = session?.pixels ?? null
    const source = pixels?.source ?? null
    const crop = session?.crop ?? null
    const viewport = session?.viewport ?? null
    const needsAppCrop =
      source === 'display' && !crop && (this.phase === 'preview' || this.phase === 'failed')
    const holding = this.phase === 'preview' || this.phase === 'failed'
    const tooBig = !!pixels && !crop && !!screenshotBytesError(pixels.file)
    return {
      phase: this.phase,
      unavailableReason: this.phase === 'unavailable' ? this.unavailableReason : null,
      error: this.error,
      comment: session?.comment ?? '',
      source,
      image: pixels?.image ?? null,
      crop,
      areaLabel: viewport ? screenshotAreaLabel(viewport) : null,
      needsAppCrop,
      canCapture: this.phase === 'idle',
      canCrop: !!pixels && holding,
      canUseEntireImage: this.phase === 'preview' && source === 'app',
      canUseAppRegion:
        this.phase === 'preview' &&
        source === 'display' &&
        !!pixels?.appInImage &&
        !!pixels.appViewport,
      canComment: holding && !!pixels,
      canConfirm: this.phase === 'preview' && !!pixels && !!viewport && !needsAppCrop && !tooBig,
      canRetry: this.phase === 'failed' && !!session?.canRetry,
      canRemove: !!pixels && (holding || this.phase === 'uploading'),
    }
  }
}
