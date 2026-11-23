import { CHAT_ATTACHMENT_MAX_BYTES } from 'thefactory-tools/constants'
import type { ChatAppNoteRect } from '../api/generated'
import { APP_NOTE_TEXT } from './appNotesConstants'
import type { AppNote } from './appNotesTypes'
import { attachmentUploadError } from './chatDrop'
import {
  KEPT_ATTACHMENT_PATH,
  MIN_CROP_PIXELS,
  SCREENSHOT_ANNOTATION_TEXT,
  UNSAFE_ATTACHMENT_SEGMENT,
} from './screenshotAnnotationConstants'
import type { ChatAttachmentFile } from '../api/chatAttachmentUploadTypes'
import type {
  ScreenshotCaptureAdapter,
  ScreenshotCropPercent,
  ScreenshotCropMapping,
  ScreenshotImageSize,
  ScreenshotLaunch,
  ScreenshotPixelRect,
  ScreenshotPointRect,
} from './screenshotAnnotationTypes'

const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const positive = (value: unknown): value is number => finite(value) && value > 0

export function screenshotImageError(image: ScreenshotImageSize | undefined): string | null {
  if (!image || !positive(image.width) || !positive(image.height)) {
    return SCREENSHOT_ANNOTATION_TEXT.invalidImage
  }
  return null
}

/** A frozen copy of the launch, so the host changing its own objects cannot move the destination. */
export function freezeScreenshotLaunch(launch: ScreenshotLaunch): ScreenshotLaunch {
  return Object.freeze({
    context: Object.freeze({ ...launch.context }),
    projectId: launch.projectId,
    route: launch.route
      ? Object.freeze({
          view: launch.route.view,
          params: Object.freeze({ ...launch.route.params }),
        })
      : null,
  })
}

/** Why capture cannot start, or null when the adapter can be asked. */
export function screenshotUnavailableReason(
  adapter: ScreenshotCaptureAdapter | null | undefined,
): string | null {
  if (!adapter) return SCREENSHOT_ANNOTATION_TEXT.noAdapter
  const reason = adapter.unavailableReason?.trim()
  return reason ? reason : null
}

/** A kept attachment path, or null when `path` is a local URI, data URL or anything else. */
export function keptAttachmentPath(path: string): string | null {
  if (!KEPT_ATTACHMENT_PATH.test(path)) return null
  return path.split('/').some((part) => UNSAFE_ATTACHMENT_SEGMENT.test(part)) ? null : path
}

/** A native capture's file shown by its uri. A web blob has none: the web panel makes an object URL. */
export function screenshotPreviewUri(file: ChatAttachmentFile): string | null {
  return 'uri' in file ? file.uri : null
}

/** The rectangle a drag on the preview covers, whichever way it went. */
export function screenshotDragRect(
  from: { x: number; y: number },
  to: { x: number; y: number },
): ScreenshotPointRect {
  return {
    x: Math.min(from.x, to.x),
    y: Math.min(from.y, to.y),
    width: Math.abs(to.x - from.x),
    height: Math.abs(to.y - from.y),
  }
}

/** Where a pixel crop sits on the preview, as percentages of the image, for both panels. */
export function screenshotCropPercent(
  crop: ScreenshotPixelRect,
  image: ScreenshotImageSize,
): ScreenshotCropPercent {
  const percent = (part: number, whole: number): `${number}%` => `${(part / whole) * 100}%`
  return {
    left: percent(crop.x, image.width),
    top: percent(crop.y, image.height),
    width: percent(crop.width, image.width),
    height: percent(crop.height, image.height),
  }
}

export function screenshotBytesError(file: { name: string; size?: number }): string | null {
  if (file.size === undefined) return null
  return (
    attachmentUploadError({ name: file.name, size: file.size }, CHAT_ATTACHMENT_MAX_BYTES) ?? null
  )
}

export type ScreenshotCropSuccess = {
  ok: true
  imageRect: ScreenshotPixelRect
  /** The same region in app-viewport points, after offset and scroll, before it is clamped to the viewport. */
  localRect: ScreenshotPointRect
}

export type ScreenshotCropRejection = {
  ok: false
  reason: string
}

/**
 * Map a point-space rectangle onto decoded image pixels.
 * Image position is `(point + scroll - iframeOffset) * hostZoom * scale`.
 * Scale is per axis and may be fractional. It is not `devicePixelRatio`
 * unless the caller measured that ratio against the decoded image.
 */
export function cropToImagePixels(
  selection: ScreenshotPointRect,
  mapping: ScreenshotCropMapping,
): ScreenshotCropSuccess | ScreenshotCropRejection {
  if (!positive(mapping.image.width) || !positive(mapping.image.height)) {
    return { ok: false, reason: SCREENSHOT_ANNOTATION_TEXT.invalidImage }
  }
  if (
    !finite(mapping.iframeOffset.x) ||
    !finite(mapping.iframeOffset.y) ||
    !finite(mapping.scroll.x) ||
    !finite(mapping.scroll.y) ||
    !positive(mapping.hostZoom) ||
    !positive(mapping.scaleX) ||
    !positive(mapping.scaleY)
  ) {
    return { ok: false, reason: SCREENSHOT_ANNOTATION_TEXT.invalidMapping }
  }
  if (
    !finite(selection.x) ||
    !finite(selection.y) ||
    !positive(selection.width) ||
    !positive(selection.height)
  ) {
    return { ok: false, reason: SCREENSHOT_ANNOTATION_TEXT.invalidCrop }
  }
  const factorX = mapping.hostZoom * mapping.scaleX
  const factorY = mapping.hostZoom * mapping.scaleY
  if (!positive(factorX) || !positive(factorY)) {
    return { ok: false, reason: SCREENSHOT_ANNOTATION_TEXT.invalidMapping }
  }
  const raw: ScreenshotPixelRect = {
    x: (selection.x + mapping.scroll.x - mapping.iframeOffset.x) * factorX,
    y: (selection.y + mapping.scroll.y - mapping.iframeOffset.y) * factorY,
    width: selection.width * factorX,
    height: selection.height * factorY,
  }
  const imageRect = intersectRect(
    raw,
    { x: 0, y: 0, width: mapping.image.width, height: mapping.image.height },
    MIN_CROP_PIXELS,
  )
  if (!imageRect) return { ok: false, reason: SCREENSHOT_ANNOTATION_TEXT.invalidCrop }
  return {
    ok: true,
    imageRect,
    localRect: {
      x: imageRect.x / factorX,
      y: imageRect.y / factorY,
      width: imageRect.width / factorX,
      height: imageRect.height / factorY,
    },
  }
}

/**
 * Scale for a crop drawn on the frozen image. The preview's layout size
 * already includes host zoom, so `hostZoom` stays 1. The scale is decoded
 * image pixels per rendered point, not `devicePixelRatio`.
 */
export function previewCropMapping(
  image: ScreenshotImageSize,
  rendered: ScreenshotImageSize,
): ScreenshotCropMapping | null {
  if (!positive(rendered.width) || !positive(rendered.height)) return null
  if (!positive(image.width) || !positive(image.height)) return null
  return {
    iframeOffset: { x: 0, y: 0 },
    scroll: { x: 0, y: 0 },
    hostZoom: 1,
    scaleX: image.width / rendered.width,
    scaleY: image.height / rendered.height,
    image,
    space: 'preview',
  }
}

export type ResolvedScreenshotCrop = {
  ok: true
  imageRect: ScreenshotPixelRect
  rect: ChatAppNoteRect
}

/** The crop that will be cut out of the file, and the area the note records. */
export function resolveScreenshotCrop(input: {
  selection: ScreenshotPointRect
  mapping: ScreenshotCropMapping
  source: 'app' | 'display'
  appViewport?: ScreenshotImageSize
  appInImage?: ScreenshotPixelRect
}): ResolvedScreenshotCrop | ScreenshotCropRejection {
  const mapped = cropToImagePixels(input.selection, input.mapping)
  if (!mapped.ok) return mapped
  let imageRect = mapped.imageRect
  if (input.appInImage) {
    const inside = intersectRect(imageRect, input.appInImage, MIN_CROP_PIXELS)
    if (!inside) return { ok: false, reason: SCREENSHOT_ANNOTATION_TEXT.invalidCrop }
    imageRect = inside
  }
  const rect = noteRect({
    source: input.source,
    space: input.mapping.space,
    image: input.mapping.image,
    imageRect,
    localRect: mapped.localRect,
    appViewport: input.appViewport,
    appInImage: input.appInImage,
  })
  if (!rect.ok) return rect
  return { ok: true, imageRect, rect: rect.rect }
}

/** The whole app image, which a display capture is not. */
export function resolveEntireImage(input: {
  source: 'app' | 'display'
  appViewport?: ScreenshotImageSize
}): { ok: true; rect: ChatAppNoteRect } | ScreenshotCropRejection {
  if (input.source === 'display') {
    return { ok: false, reason: SCREENSHOT_ANNOTATION_TEXT.needsAppCrop }
  }
  if (screenshotImageError(input.appViewport)) {
    return { ok: false, reason: SCREENSHOT_ANNOTATION_TEXT.appSize }
  }
  const viewport = input.appViewport as ScreenshotImageSize
  return {
    ok: true,
    rect: { x: 0, y: 0, width: viewport.width, height: viewport.height, space: 'app-viewport' },
  }
}

/** The measured app region inside a display capture. */
export function resolveAppRegion(input: {
  image: ScreenshotImageSize
  appInImage: ScreenshotPixelRect
  appViewport?: ScreenshotImageSize
}): ResolvedScreenshotCrop | ScreenshotCropRejection {
  if (screenshotImageError(input.appViewport)) {
    return { ok: false, reason: SCREENSHOT_ANNOTATION_TEXT.appSize }
  }
  const imageRect = intersectRect(
    input.appInImage,
    { x: 0, y: 0, width: input.image.width, height: input.image.height },
    MIN_CROP_PIXELS,
  )
  if (!imageRect) return { ok: false, reason: SCREENSHOT_ANNOTATION_TEXT.invalidCrop }
  const viewport = input.appViewport as ScreenshotImageSize
  return {
    ok: true,
    imageRect,
    rect: { x: 0, y: 0, width: viewport.width, height: viewport.height, space: 'app-viewport' },
  }
}

/**
 * One area note. `screenshotFile` is the kept attachment path and nothing else
 * is copied from the capture: no local URI, view token, data URL or base64.
 */
export function screenshotNote(input: {
  id: string
  launch: ScreenshotLaunch
  comment: string
  rect: ChatAppNoteRect
  screenshotFile: string
}): AppNote {
  return {
    id: input.id,
    projectId: input.launch.projectId,
    ...(input.launch.route
      ? { view: input.launch.route.view, params: { ...input.launch.route.params } }
      : {}),
    comment: input.comment,
    targets: [{ kind: 'area', rect: { ...input.rect, space: 'app-viewport' } }],
    screenshotFile: input.screenshotFile,
  }
}

export function screenshotAreaLabel(rect: { width: number; height: number }): string {
  return APP_NOTE_TEXT.area(Math.round(rect.width), Math.round(rect.height))
}

function noteRect(input: {
  source: 'app' | 'display'
  space: 'app-viewport' | 'preview'
  image: ScreenshotImageSize
  imageRect: ScreenshotPixelRect
  localRect: ScreenshotPointRect
  appViewport?: ScreenshotImageSize
  appInImage?: ScreenshotPixelRect
}): { ok: true; rect: ChatAppNoteRect } | ScreenshotCropRejection {
  if (input.space === 'app-viewport') {
    const clamped = clampLocal(input.localRect, input.appViewport)
    if (!clamped) return { ok: false, reason: SCREENSHOT_ANNOTATION_TEXT.invalidCrop }
    return { ok: true, rect: { ...clamped, space: 'app-viewport' } }
  }
  if (input.appInImage && input.appViewport && !screenshotImageError(input.appViewport)) {
    const rect = {
      x:
        ((input.imageRect.x - input.appInImage.x) / input.appInImage.width) *
        input.appViewport.width,
      y:
        ((input.imageRect.y - input.appInImage.y) / input.appInImage.height) *
        input.appViewport.height,
      width: (input.imageRect.width / input.appInImage.width) * input.appViewport.width,
      height: (input.imageRect.height / input.appInImage.height) * input.appViewport.height,
    }
    const clamped = clampLocal(rect, input.appViewport)
    if (!clamped) return { ok: false, reason: SCREENSHOT_ANNOTATION_TEXT.invalidCrop }
    return { ok: true, rect: { ...clamped, space: 'app-viewport' } }
  }
  if (input.source === 'app') {
    if (screenshotImageError(input.appViewport)) {
      return { ok: false, reason: SCREENSHOT_ANNOTATION_TEXT.appSize }
    }
    const viewport = input.appViewport as ScreenshotImageSize
    const rect = {
      x: (input.imageRect.x / input.image.width) * viewport.width,
      y: (input.imageRect.y / input.image.height) * viewport.height,
      width: (input.imageRect.width / input.image.width) * viewport.width,
      height: (input.imageRect.height / input.image.height) * viewport.height,
    }
    if (!positive(rect.width) || !positive(rect.height)) {
      return { ok: false, reason: SCREENSHOT_ANNOTATION_TEXT.invalidCrop }
    }
    return { ok: true, rect: { ...rect, space: 'app-viewport' } }
  }
  // A display crop is an app region only once it is mapped through the measured
  // app. A viewport on its own, or the crop's pixel size at (0, 0), is not.
  return { ok: false, reason: SCREENSHOT_ANNOTATION_TEXT.appSize }
}

function clampLocal(
  rect: ScreenshotPointRect,
  viewport: ScreenshotImageSize | undefined,
): ScreenshotPointRect | null {
  if (!viewport) {
    return positive(rect.width) && positive(rect.height) ? rect : null
  }
  return intersectRect(rect, { x: 0, y: 0, width: viewport.width, height: viewport.height }, 0)
}

function intersectRect(
  rect: ScreenshotPointRect,
  bounds: ScreenshotPointRect,
  minimum: number,
): ScreenshotPointRect | null {
  const x = Math.max(rect.x, bounds.x)
  const y = Math.max(rect.y, bounds.y)
  const width = Math.min(rect.x + rect.width, bounds.x + bounds.width) - x
  const height = Math.min(rect.y + rect.height, bounds.y + bounds.height) - y
  if (!(width > 0) || !(height > 0)) return null
  if (minimum > 0 && (width < minimum || height < minimum)) return null
  return { x, y, width, height }
}
