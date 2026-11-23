import type { ScreenshotAnnotationSnapshot } from './screenshotAnnotationTypes'

/** Copy for the shared screenshot annotation. The same words on web and native. */
export const SCREENSHOT_ANNOTATION_TEXT = {
  noAdapter: 'Screenshot capture is not available here. No supported capture adapter was supplied.',
  title: 'Annotate the app',
  capture: 'Capture',
  capturing: 'Capturing…',
  comment: 'Comment',
  commentPlaceholder: 'What should change here?',
  useEntireImage: 'Use the whole image',
  useAppRegion: 'Crop to the app',
  confirm: 'Add to chat',
  confirmHint: 'Nothing is sent until you send the message.',
  cancel: 'Cancel',
  retry: 'Try again',
  remove: 'Remove',
  uploading: 'Uploading…',
  displaySource:
    'The browser chose this screen. It might not be the app. Crop it to the app, or cancel.',
  needsAppCrop: 'Crop this image to the app, or cancel.',
  invalidCrop: 'That crop is empty or outside the image.',
  invalidMapping: 'The crop scale is not a positive number.',
  invalidImage: 'The captured image has no usable size.',
  appSize: 'The app size was not measured, so this image cannot be attached.',
  cannotCrop: 'This capture cannot be cropped to the app.',
  captureFailed: 'The capture did not finish.',
  unusablePath: 'The upload did not return a kept attachment.',
  preview: 'Captured app',
  cropHint: 'Drag on the image to crop it.',
  cropArea: 'Crop area',
} as const

/**
 * A kept chat attachment, as `validateChatAppNote` requires it. A local URI, a
 * view token, a data URL or a base64 image must not be stored on a note.
 */
export const KEPT_ATTACHMENT_PATH =
  /^\.factory\/attachments\/(?:[^/\\\s:?#\u0000-\u001f]+\/)*[^/\\\s:?#\u0000-\u001f]+$/

/** A crop thinner than one image pixel is empty. */
export const MIN_CROP_PIXELS = 1

/** A path segment that is a dot step or carries a percent-escape, which a kept path never has. */
export const UNSAFE_ATTACHMENT_SEGMENT = /^\.{1,2}$|%[0-9a-f]{2}/i

/** A draft holding nothing, and the snapshot before a composer has its draft. */
export const SCREENSHOT_ANNOTATION_IDLE: ScreenshotAnnotationSnapshot = {
  phase: 'idle',
  unavailableReason: null,
  error: null,
  comment: '',
  source: null,
  image: null,
  crop: null,
  areaLabel: null,
  needsAppCrop: false,
  canCapture: true,
  canCrop: false,
  canUseEntireImage: false,
  canUseAppRegion: false,
  canComment: false,
  canConfirm: false,
  canRetry: false,
  canRemove: false,
}
