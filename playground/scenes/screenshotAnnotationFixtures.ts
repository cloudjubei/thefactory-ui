import { useEffect, useRef, useState } from 'react'
import {
  ChatAttachmentUploadError,
  type ChatAttachmentFile,
  type UploadChatFile,
} from '../../src/headless/api'
import type { ChatContext } from '../../src/headless/api/generated'
import {
  ScreenshotAnnotationDraft,
  previewCropMapping,
  type AppNote,
  type ScreenshotAnnotationComposer,
  type ScreenshotCaptureAdapter,
  type ScreenshotCapturedPixels,
  type ScreenshotLaunch,
} from 'thefactory-ui/headless'

/** The states the screenshot annotation is shown in, on web and native alike. */
export type ScreenshotAnnotationCase =
  | 'unavailable'
  | 'ready'
  | 'capturing'
  | 'preview'
  | 'edited'
  | 'display'
  | 'uploading'
  | 'failed'
  | 'added'
  | 'removed'
  | 'cancelled'

export const SCREENSHOT_CASES: { id: ScreenshotAnnotationCase; title: string }[] = [
  { id: 'unavailable', title: 'No capture adapter: Capture is off and says why' },
  { id: 'ready', title: 'Adapter supplied: ready to capture' },
  { id: 'capturing', title: 'Capturing, with Cancel' },
  { id: 'preview', title: 'Preview of the captured app, nothing sent' },
  { id: 'edited', title: 'Cropped with a comment, ready to add' },
  { id: 'display', title: 'Display capture: crop to the app before adding' },
  { id: 'uploading', title: 'Uploading to the launching chat, with Cancel' },
  { id: 'failed', title: 'Upload failed: Try again or Remove' },
  { id: 'added', title: 'Added as a note in the composer, not sent' },
  { id: 'removed', title: 'Removed: image released, back to Capture' },
  { id: 'cancelled', title: 'Capture cancelled: late result released' },
]

export const SCREENSHOT_IMAGE = { width: 800, height: 500 }
export const SCREENSHOT_VIEWPORT = { width: 400, height: 250 }
const SCREEN_IMAGE = { width: 1280, height: 800 }
const APP_IN_SCREEN = { x: 240, y: 150, width: 800, height: 500 }

const KEPT_PATH = '.factory/attachments/chat-a/app-shot.png'

/** A fixed fake app, drawn as an SVG so every load shows the same pixels. */
export const SCREENSHOT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><rect width="800" height="500" fill="#f4f5f7"/><rect width="800" height="64" fill="#17202a"/><text x="32" y="41" font-family="system-ui" font-size="22" fill="#fff">Workspace plan</text><text x="32" y="140" font-family="system-ui" font-size="28" fill="#17202a">Renews November 20</text><rect x="32" y="190" width="180" height="52" rx="8" fill="#1260a0"/><text x="72" y="223" font-family="system-ui" font-size="20" fill="#fff">Upgrade</text><rect x="480" y="110" width="280" height="300" rx="12" fill="#ffffff" stroke="#d0d5dd"/><text x="508" y="160" font-family="system-ui" font-size="18" fill="#475467">Seats used</text><text x="508" y="210" font-family="system-ui" font-size="40" fill="#17202a">12 / 20</text></svg>`

const SCREEN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800"><rect width="1280" height="800" fill="#2d3748"/><rect x="240" y="150" width="800" height="500" fill="#f4f5f7"/><rect x="240" y="150" width="800" height="64" fill="#17202a"/><text x="272" y="191" font-family="system-ui" font-size="22" fill="#fff">Workspace plan</text><text x="272" y="290" font-family="system-ui" font-size="28" fill="#17202a">Renews November 20</text><rect x="0" y="0" width="1280" height="36" fill="#1a202c"/><text x="16" y="24" font-family="system-ui" font-size="16" fill="#a0aec0">Desktop</text></svg>`

/** How a platform holds a captured image: web as a blob, native by uri. */
export type ScreenshotFileOf = (svg: string, name: string) => ChatAttachmentFile

export const webScreenshotFile: ScreenshotFileOf = (svg, name) => {
  const blob = new Blob([svg], { type: 'image/svg+xml' })
  return { name, size: blob.size, blob }
}

export const nativeScreenshotFile: ScreenshotFileOf = (svg, name) => ({
  name,
  size: svg.length,
  uri: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
})

const LAUNCH: ScreenshotLaunch = {
  context: { type: 'PROJECT', projectId: 'sample' } as ChatContext,
  projectId: 'sample',
  route: { view: 'plan', params: { tab: 'billing' } },
}

const never = <T>() => new Promise<T>(() => {})

/**
 * One state reached through the real draft: a fake adapter and upload, then
 * the same calls a person's presses make. Returns what the composer is given.
 */
export function useScreenshotScene(state: ScreenshotAnnotationCase, fileOf: ScreenshotFileOf) {
  const [draft] = useState(() => new ScreenshotAnnotationDraft())
  const [appNotes, setAppNotes] = useState<AppNote[]>([])
  const [released, setReleased] = useState<string[]>([])
  const started = useRef(false)

  const appPixels = (): ScreenshotCapturedPixels => ({
    file: fileOf(SCREENSHOT_SVG, 'app-shot.svg'),
    image: SCREENSHOT_IMAGE,
    source: 'app',
    appViewport: SCREENSHOT_VIEWPORT,
  })
  const screenPixels = (): ScreenshotCapturedPixels => ({
    file: fileOf(SCREEN_SVG, 'screen-shot.svg'),
    image: SCREEN_IMAGE,
    source: 'display',
    appViewport: SCREENSHOT_VIEWPORT,
    appInImage: APP_IN_SCREEN,
  })

  const late = useRef<(pixels: ScreenshotCapturedPixels) => void>(() => {})
  const adapter: ScreenshotCaptureAdapter = {
    capture: () => {
      if (state === 'capturing') return never()
      if (state === 'cancelled') {
        return new Promise((resolve) => {
          late.current = resolve
        })
      }
      return Promise.resolve(state === 'display' ? screenPixels() : appPixels())
    },
    release: (pixels) => setReleased((names) => [...names, pixels.file.name]),
    crop: async (pixels) => ({ ...pixels, file: fileOf(SCREENSHOT_SVG, 'app-shot-crop.svg') }),
  }
  const upload: UploadChatFile = () => {
    if (state === 'uploading') return never()
    if (state === 'failed') {
      return Promise.reject(
        new ChatAttachmentUploadError('The upload did not finish. Check the connection.', 503),
      )
    }
    return Promise.resolve(KEPT_PATH)
  }
  const onNote = (note: AppNote) => setAppNotes((notes) => [...notes, note])

  useEffect(() => {
    if (started.current || state === 'unavailable' || state === 'ready') return
    started.current = true
    void (async () => {
      draft.requestCapture(LAUNCH, adapter, upload, onNote)
      if (state === 'cancelled') {
        draft.cancel()
        late.current(appPixels())
        return
      }
      await Promise.resolve()
      await Promise.resolve()
      if (state === 'capturing') return
      if (state === 'edited' || state === 'uploading' || state === 'failed' || state === 'added') {
        draft.setComment('Make the renewal date bolder.')
      }
      if (state === 'edited') {
        const mapping = previewCropMapping(SCREENSHOT_IMAGE, SCREENSHOT_VIEWPORT)
        if (mapping) draft.applyCrop({ x: 8, y: 40, width: 220, height: 90 }, mapping)
      }
      if (state === 'uploading' || state === 'failed' || state === 'added') draft.confirm()
      if (state === 'removed') draft.remove()
    })()
  })

  const screenshot: ScreenshotAnnotationComposer = {
    adapter: state === 'unavailable' ? null : adapter,
    launch: () => LAUNCH,
    upload,
    onNote,
    draft,
  }
  return { screenshot, appNotes, setAppNotes, released }
}
