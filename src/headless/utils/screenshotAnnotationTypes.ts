import type { ChatAttachmentFile, UploadChatFile } from '../api/chatAttachmentUploadTypes'
import type { ChatContext } from '../api/generated'
import type { AppDeepLink } from './appDeepLink'
import type { AppNote } from './appNotesTypes'
import type { ScreenshotAnnotationDraft } from './screenshotAnnotationDraft'

/**
 * The chat, project and app route at the moment the person asks to capture.
 * Frozen then. Later navigation or a chat switch does not change it.
 */
export type ScreenshotLaunch = {
  context: ChatContext
  projectId: string
  route: AppDeepLink | null
}

export type ScreenshotImageSize = {
  width: number
  height: number
}

/** A rectangle in decoded image pixels. */
export type ScreenshotPixelRect = {
  x: number
  y: number
  width: number
  height: number
}

/** A pixel crop placed on the preview, as percentages of the image. */
export type ScreenshotCropPercent = {
  left: `${number}%`
  top: `${number}%`
  width: `${number}%`
  height: `${number}%`
}

/** A rectangle in CSS, display or native points. */
export type ScreenshotPointRect = {
  x: number
  y: number
  width: number
  height: number
}

/**
 * How a point-space rectangle maps onto decoded image pixels.
 * `scaleX` and `scaleY` are image pixels per point after `hostZoom`.
 * They are measured against the decoded image. `devicePixelRatio` alone is
 * not a scale: a captured video can be a different size from the screen.
 */
export type ScreenshotCropMapping = {
  /** Top-left of the app surface in the selection's point space. */
  iframeOffset: { x: number; y: number }
  /** Host scroll, in the same point space. Added when the selection is in document points. */
  scroll: { x: number; y: number }
  /** Host zoom. 1 is 100%. Fractional zoom is valid. */
  hostZoom: number
  scaleX: number
  scaleY: number
  /** Decoded size of the frozen image. */
  image: ScreenshotImageSize
  /**
   * `app-viewport` — the selection was measured on the live app.
   * `preview` — the selection was drawn on the frozen image. Host zoom is
   * already in the preview's layout size, so callers pass `hostZoom: 1` and
   * a scale of image pixels per rendered point.
   */
  space: 'app-viewport' | 'preview'
}

/** Pixels the host captured. The file is what the attachment API uploads. */
export type ScreenshotCapturedPixels = {
  file: ChatAttachmentFile
  /** Decoded pixel size. Not inferred from `devicePixelRatio`. */
  image: ScreenshotImageSize
  /**
   * `app` — these pixels are the app surface.
   * `display` — the browser chose a monitor or window. The person crops to
   * the app, or cancels. The whole image is not uploaded.
   */
  source: 'app' | 'display'
  /** App viewport in points, when the host measured it. */
  appViewport?: ScreenshotImageSize
  /** Where the app sits inside a display capture, in image pixels. */
  appInImage?: ScreenshotPixelRect
}

/**
 * What a host implements to take pixels. Headless code calls it and never
 * imports a browser, Electron or native API. Absent, capture is unavailable.
 */
export type ScreenshotCaptureAdapter = {
  /** Shown instead of Capture when this host cannot capture. */
  unavailableReason?: string
  /** Starts only when called, from a gesture the host already has. */
  capture: (request: { signal: AbortSignal }) => Promise<ScreenshotCapturedPixels>
  /** Stop tracks and delete temporary files. Idempotent. */
  release: (pixels: ScreenshotCapturedPixels) => void
  /** Return a new file of just `rect`. Absent, a partial crop cannot be attached. */
  crop?: (
    pixels: ScreenshotCapturedPixels,
    rect: ScreenshotPixelRect,
  ) => Promise<ScreenshotCapturedPixels>
}

export type ScreenshotAnnotationPhase =
  | 'unavailable'
  | 'idle'
  | 'capturing'
  | 'preview'
  | 'uploading'
  | 'failed'

/** What the web and native panels render. One shape for both. */
export type ScreenshotAnnotationSnapshot = {
  phase: ScreenshotAnnotationPhase
  unavailableReason: string | null
  error: string | null
  comment: string
  source: 'app' | 'display' | null
  image: ScreenshotImageSize | null
  crop: ScreenshotPixelRect | null
  areaLabel: string | null
  needsAppCrop: boolean
  canCapture: boolean
  canCrop: boolean
  canUseEntireImage: boolean
  canUseAppRegion: boolean
  canComment: boolean
  canConfirm: boolean
  canRetry: boolean
  canRemove: boolean
}

/**
 * Optional screenshot annotation on a composer. Absent, the composer is as it
 * was. Present without a supported `adapter`, Capture shows why it is
 * unavailable instead of capturing.
 */
export type ScreenshotAnnotationComposer = {
  adapter?: ScreenshotCaptureAdapter | null
  /** Read once, when the person presses Capture. The draft keeps that copy. */
  launch: () => ScreenshotLaunch
  upload: UploadChatFile
  /** The confirmed note for the chat `launch` named. Nothing is sent: the note joins that chat's draft. */
  onNote: (note: AppNote, launch: ScreenshotLaunch) => void
  /** A draft the host keeps above the composer. Absent, the composer keeps its own and drops it on unmount. */
  draft?: ScreenshotAnnotationDraft
}

/** What both panels read from {@link ScreenshotAnnotationComposer}. */
export type ScreenshotAnnotationView = {
  draft: ScreenshotAnnotationDraft | null
  snapshot: ScreenshotAnnotationSnapshot
  /** Why Capture is off, shown in its place. Null when it can capture. */
  unavailableReason: string | null
  previewFile: ChatAttachmentFile | null
  capture: () => void
}
