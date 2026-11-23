import { describe, expect, it, vi } from 'vitest'
import { ChatAttachmentUploadError } from '../api/chatAttachmentUpload'
import type { UploadChatFile } from '../api/chatAttachmentUploadTypes'
import type { AppNote } from './appNotesTypes'
import { SCREENSHOT_ANNOTATION_TEXT } from './screenshotAnnotationConstants'
import { ScreenshotAnnotationDraft } from './screenshotAnnotationDraft'
import { previewCropMapping } from './screenshotAnnotation'
import type { ScreenshotCropMapping } from './screenshotAnnotationTypes'
import {
  appPixels,
  deferred,
  fakeAdapter,
  flush,
  launchFor,
} from './testUtils/screenshotAnnotationFakes'

const KEPT = '.factory/attachments/chat-a/shot.png'

function pendingUploads() {
  const calls: {
    context: unknown
    file: unknown
    signal?: AbortSignal
    done: ReturnType<typeof deferred<string>>
  }[] = []
  const upload = vi.fn<UploadChatFile>((context, file, options) => {
    const done = deferred<string>()
    calls.push({ context, file, signal: options?.signal, done })
    return done.promise
  })
  return { upload, calls }
}

async function captured(draft: ScreenshotAnnotationDraft, chatId = 'chat-a') {
  const fake = fakeAdapter()
  const uploads = pendingUploads()
  const notes: AppNote[] = []
  const launch = launchFor(chatId)
  draft.requestCapture(launch, fake.adapter, uploads.upload, (note) => notes.push(note))
  const pixels = appPixels()
  fake.captures[0]?.resolve(pixels)
  await flush()
  return { fake, uploads, notes, launch, pixels }
}

describe('ScreenshotAnnotationDraft availability', () => {
  it('is unavailable with the no-adapter reason and asks nothing when no adapter is supplied', () => {
    const draft = new ScreenshotAnnotationDraft()
    const upload = vi.fn<UploadChatFile>()
    draft.requestCapture(launchFor('chat-a'), null, upload, () => {})
    expect(draft.getSnapshot()).toMatchObject({
      phase: 'unavailable',
      unavailableReason: SCREENSHOT_ANNOTATION_TEXT.noAdapter,
      canCapture: false,
      canConfirm: false,
    })
    expect(upload).not.toHaveBeenCalled()
  })

  it('shows the adapter’s own reason and never calls its capture', () => {
    const fake = fakeAdapter()
    const draft = new ScreenshotAnnotationDraft()
    draft.requestCapture(
      launchFor('chat-a'),
      { ...fake.adapter, unavailableReason: 'Needs screen recording permission.' },
      vi.fn<UploadChatFile>(),
      () => {},
    )
    expect(draft.getSnapshot().unavailableReason).toBe('Needs screen recording permission.')
    expect(fake.adapter.capture).not.toHaveBeenCalled()
  })
})

describe('ScreenshotAnnotationDraft launch ownership', () => {
  it('uploads to the launching chat and keeps its route after the host navigates and switches chat', async () => {
    const draft = new ScreenshotAnnotationDraft()
    const fake = fakeAdapter()
    const uploads = pendingUploads()
    const notes: AppNote[] = []
    const launch = launchFor('chat-a', 'settings')
    draft.requestCapture(launch, fake.adapter, uploads.upload, (note) => notes.push(note))
    launch.route = { view: 'billing', params: { tab: 'billing' } }
    ;(launch.context as { id?: string }).id = 'chat-b'
    launch.projectId = 'p2'
    fake.captures[0]?.resolve(appPixels())
    await flush()
    draft.confirm()
    await flush()
    expect(uploads.calls[0]?.context).toMatchObject({ id: 'chat-a' })
    uploads.calls[0]?.done.resolve(KEPT)
    await flush()
    expect(notes).toHaveLength(1)
    expect(notes[0]).toMatchObject({
      projectId: 'p1',
      view: 'settings',
      params: { tab: 'settings' },
    })
  })

  it('shows only the newest of two overlapping captures and releases the older one', async () => {
    const draft = new ScreenshotAnnotationDraft()
    const fake = fakeAdapter()
    const uploads = pendingUploads()
    draft.requestCapture(launchFor('chat-a'), fake.adapter, uploads.upload, () => {})
    draft.requestCapture(launchFor('chat-b'), fake.adapter, uploads.upload, () => {})
    expect(fake.signals[0]?.aborted).toBe(true)
    const newer = appPixels('newer.png')
    const older = appPixels('older.png')
    fake.captures[1]?.resolve(newer)
    await flush()
    fake.captures[0]?.resolve(older)
    await flush()
    expect(draft.getPreviewFile()).toBe(newer.file)
    expect(fake.released).toEqual([older])
    draft.confirm()
    await flush()
    expect(uploads.calls[0]?.context).toMatchObject({ id: 'chat-b' })
  })

  it('drops an upload that finishes after a newer capture began, so its note never reaches the other chat', async () => {
    const draft = new ScreenshotAnnotationDraft()
    const first = await captured(draft, 'chat-a')
    draft.confirm()
    await flush()
    const secondNotes: AppNote[] = []
    const second = fakeAdapter()
    draft.requestCapture(launchFor('chat-b'), second.adapter, first.uploads.upload, (note) =>
      secondNotes.push(note),
    )
    expect(first.uploads.calls[0]?.signal?.aborted).toBe(true)
    first.uploads.calls[0]?.done.resolve(KEPT)
    await flush()
    expect(first.notes).toEqual([])
    expect(secondNotes).toEqual([])
    expect(draft.getSnapshot().phase).toBe('capturing')
    expect(first.fake.released).toEqual([first.pixels])
  })
})

describe('ScreenshotAnnotationDraft preview and confirmation', () => {
  it('holds an editable preview and sends nothing until confirmed', async () => {
    const draft = new ScreenshotAnnotationDraft()
    const { uploads, notes, pixels } = await captured(draft)
    expect(draft.getSnapshot()).toMatchObject({
      phase: 'preview',
      image: pixels.image,
      areaLabel: 'Area 400 × 300',
      canComment: true,
      canConfirm: true,
      canRemove: true,
    })
    expect(draft.getPreviewFile()).toBe(pixels.file)
    draft.setComment('Make this bigger')
    expect(draft.getSnapshot().comment).toBe('Make this bigger')
    expect(uploads.upload).not.toHaveBeenCalled()
    expect(notes).toEqual([])
  })

  it('confirms by uploading, then hands back one area note with the comment and releases the pixels', async () => {
    const draft = new ScreenshotAnnotationDraft()
    const { fake, uploads, notes, pixels } = await captured(draft)
    draft.setComment('Make this bigger')
    draft.confirm()
    expect(draft.getSnapshot()).toMatchObject({ phase: 'uploading', canConfirm: false })
    uploads.calls[0]?.done.resolve(KEPT)
    await flush()
    expect(notes).toEqual([
      expect.objectContaining({
        comment: 'Make this bigger',
        screenshotFile: KEPT,
        targets: [
          { kind: 'area', rect: { x: 0, y: 0, width: 400, height: 300, space: 'app-viewport' } },
        ],
      }),
    ])
    expect(fake.released).toEqual([pixels])
    expect(draft.getSnapshot().phase).toBe('idle')
    expect(draft.getPreviewFile()).toBeNull()
  })

  it('keeps an empty comment so a screenshot-only note sends like any other note', async () => {
    const draft = new ScreenshotAnnotationDraft()
    const { uploads, notes } = await captured(draft)
    draft.confirm()
    uploads.calls[0]?.done.resolve(KEPT)
    await flush()
    expect(notes[0]?.comment).toBe('')
  })

  it('refuses an empty crop and keeps the preview it had', async () => {
    const draft = new ScreenshotAnnotationDraft()
    const { pixels } = await captured(draft)
    const mapping = previewCropMapping(pixels.image, {
      width: 400,
      height: 300,
    }) as ScreenshotCropMapping
    draft.applyCrop({ x: 10, y: 10, width: 0, height: 20 }, mapping)
    expect(draft.getSnapshot()).toMatchObject({
      phase: 'preview',
      crop: null,
      error: SCREENSHOT_ANNOTATION_TEXT.invalidCrop,
      areaLabel: 'Area 400 × 300',
    })
  })

  it('uploads the cropped file and releases both images', async () => {
    const draft = new ScreenshotAnnotationDraft()
    const { fake, uploads, notes, pixels } = await captured(draft)
    const mapping = previewCropMapping(pixels.image, {
      width: 400,
      height: 300,
    }) as ScreenshotCropMapping
    draft.applyCrop({ x: 100, y: 50, width: 200, height: 100 }, mapping)
    expect(draft.getSnapshot()).toMatchObject({
      crop: { x: 200, y: 100, width: 400, height: 200 },
      areaLabel: 'Area 200 × 100',
    })
    draft.confirm()
    const cropped = appPixels('crop.png')
    fake.crops[0]?.resolve(cropped)
    await flush()
    expect(uploads.calls[0]?.file).toBe(cropped.file)
    uploads.calls[0]?.done.resolve(KEPT)
    await flush()
    expect(notes[0]?.targets[0]).toEqual({
      kind: 'area',
      rect: { x: 100, y: 50, width: 200, height: 100, space: 'app-viewport' },
    })
    expect(fake.released).toEqual(expect.arrayContaining([pixels, cropped]))
    expect(fake.released).toHaveLength(2)
  })

  it('does not confirm a display crop that was not mapped through the measured app', async () => {
    const draft = new ScreenshotAnnotationDraft()
    const fake = fakeAdapter()
    const uploads = pendingUploads()
    draft.requestCapture(launchFor('chat-a'), fake.adapter, uploads.upload, () => {})
    fake.captures[0]?.resolve(
      appPixels('screen.png', {
        source: 'display',
        image: { width: 1920, height: 1080 },
        appViewport: { width: 400, height: 300 },
      }),
    )
    await flush()
    const mapping = previewCropMapping(
      { width: 1920, height: 1080 },
      { width: 960, height: 540 },
    ) as ScreenshotCropMapping
    draft.applyCrop({ x: 48, y: 27, width: 200, height: 100 }, mapping)
    expect(draft.getSnapshot()).toMatchObject({
      phase: 'preview',
      crop: null,
      canConfirm: false,
      error: SCREENSHOT_ANNOTATION_TEXT.appSize,
    })
    draft.confirm()
    await flush()
    expect(uploads.upload).not.toHaveBeenCalled()
    expect(draft.getSnapshot().phase).toBe('preview')
  })

  it('makes a display capture crop to the app before it can be added', async () => {
    const draft = new ScreenshotAnnotationDraft()
    const fake = fakeAdapter()
    draft.requestCapture(launchFor('chat-a'), fake.adapter, pendingUploads().upload, () => {})
    fake.captures[0]?.resolve(
      appPixels('screen.png', {
        source: 'display',
        image: { width: 1920, height: 1080 },
        appInImage: { x: 100, y: 100, width: 800, height: 600 },
        appViewport: { width: 400, height: 300 },
      }),
    )
    await flush()
    expect(draft.getSnapshot()).toMatchObject({
      needsAppCrop: true,
      canConfirm: false,
      canUseEntireImage: false,
      canUseAppRegion: true,
    })
    draft.useAppRegion()
    expect(draft.getSnapshot()).toMatchObject({
      needsAppCrop: false,
      canConfirm: true,
      crop: { x: 100, y: 100, width: 800, height: 600 },
    })
  })
})

describe('ScreenshotAnnotationDraft note ids', () => {
  it('does not reuse an id the composer already holds, so editing or removing one leaves the other', async () => {
    const firstDraft = new ScreenshotAnnotationDraft()
    const first = await captured(firstDraft)
    firstDraft.confirm()
    first.uploads.calls[0]?.done.resolve(KEPT)
    await flush()
    const kept = first.notes[0]
    expect(kept?.id).toBe('app-note-1')

    const secondDraft = new ScreenshotAnnotationDraft()
    const fake = fakeAdapter()
    const uploads = pendingUploads()
    const added: AppNote[] = []
    const composer = [kept!]
    secondDraft.requestCapture(
      launchFor('chat-a'),
      fake.adapter,
      uploads.upload,
      (note) => added.push(note),
      () => composer.map((note) => note.id),
    )
    fake.captures[0]?.resolve(appPixels('second.png'))
    await flush()
    secondDraft.setComment('Second')
    secondDraft.confirm()
    uploads.calls[0]?.done.resolve('.factory/attachments/chat-a/second.png')
    await flush()
    const second = added[0]
    expect(second?.id).toBe('app-note-2')
    expect(second?.id).not.toBe(kept?.id)
    composer.push(second!)

    const edited = composer.map((item) =>
      item.id === second!.id ? { ...item, comment: 'Only the second' } : item,
    )
    expect(edited.find((item) => item.id === kept!.id)).toEqual(kept)
    expect(edited.find((item) => item.id === second!.id)?.comment).toBe('Only the second')

    const removed = edited.filter((item) => item.id !== kept!.id)
    expect(removed).toEqual([
      expect.objectContaining({ id: 'app-note-2', comment: 'Only the second' }),
    ])
  })
})

describe('ScreenshotAnnotationDraft failures and retry', () => {
  it('keeps the draft on a failed upload and retries to the same chat', async () => {
    const draft = new ScreenshotAnnotationDraft()
    const { uploads, notes } = await captured(draft)
    draft.setComment('Kept')
    draft.confirm()
    uploads.calls[0]?.done.reject(new ChatAttachmentUploadError('The server is down.', 503))
    await flush()
    expect(draft.getSnapshot()).toMatchObject({
      phase: 'failed',
      error: 'The server is down.',
      canRetry: true,
      comment: 'Kept',
    })
    draft.retry()
    uploads.calls[1]?.done.resolve(KEPT)
    await flush()
    expect(uploads.calls[1]?.context).toMatchObject({ id: 'chat-a' })
    expect(notes).toHaveLength(1)
  })

  it('does not offer a retry for a file the backend refused for its size', async () => {
    const draft = new ScreenshotAnnotationDraft()
    const { uploads } = await captured(draft)
    draft.confirm()
    uploads.calls[0]?.done.reject(new ChatAttachmentUploadError('Too large.', 413))
    await flush()
    expect(draft.getSnapshot()).toMatchObject({ phase: 'failed', canRetry: false, canRemove: true })
  })

  it('refuses an upload path that is not a kept attachment', async () => {
    const draft = new ScreenshotAnnotationDraft()
    const { uploads, notes } = await captured(draft)
    draft.confirm()
    uploads.calls[0]?.done.resolve('blob:http://host/123')
    await flush()
    expect(draft.getSnapshot()).toMatchObject({
      phase: 'failed',
      error: SCREENSHOT_ANNOTATION_TEXT.unusablePath,
      canRetry: false,
    })
    expect(notes).toEqual([])
  })

  it('releases the first cropped file before a retry crops again', async () => {
    const draft = new ScreenshotAnnotationDraft()
    const { fake, uploads, pixels } = await captured(draft)
    const mapping = previewCropMapping(pixels.image, {
      width: 400,
      height: 300,
    }) as ScreenshotCropMapping
    draft.applyCrop({ x: 0, y: 0, width: 100, height: 100 }, mapping)
    draft.confirm()
    const firstCrop = appPixels('crop-1.png')
    fake.crops[0]?.resolve(firstCrop)
    await flush()
    uploads.calls[0]?.done.reject(new ChatAttachmentUploadError('Offline.'))
    await flush()
    draft.retry()
    await flush()
    expect(fake.released).toContain(firstCrop)
  })

  it('shows why a capture failed and goes back to idle', async () => {
    const draft = new ScreenshotAnnotationDraft()
    const fake = fakeAdapter()
    draft.requestCapture(launchFor('chat-a'), fake.adapter, pendingUploads().upload, () => {})
    fake.captures[0]?.reject(new Error('Permission denied.'))
    await flush()
    expect(fake.signals[0]?.aborted).toBe(true)
    expect(draft.getSnapshot()).toMatchObject({
      phase: 'idle',
      error: 'Permission denied.',
      canCapture: true,
    })
  })

  it('releases a capture with no usable size instead of previewing it', async () => {
    const draft = new ScreenshotAnnotationDraft()
    const fake = fakeAdapter()
    draft.requestCapture(launchFor('chat-a'), fake.adapter, pendingUploads().upload, () => {})
    const broken = appPixels('broken.png', { image: { width: 0, height: 0 } })
    fake.captures[0]?.resolve(broken)
    await flush()
    expect(draft.getSnapshot()).toMatchObject({
      phase: 'idle',
      error: SCREENSHOT_ANNOTATION_TEXT.invalidImage,
    })
    expect(fake.released).toEqual([broken])
  })
})

describe('ScreenshotAnnotationDraft remove, cancel and unmount', () => {
  it('removes the preview and releases its pixels once', async () => {
    const draft = new ScreenshotAnnotationDraft()
    const { fake, pixels } = await captured(draft)
    draft.remove()
    draft.remove()
    expect(draft.getSnapshot()).toMatchObject({ phase: 'idle', canRemove: false })
    expect(draft.getPreviewFile()).toBeNull()
    expect(fake.released).toEqual([pixels])
  })

  it('cancels a running capture, aborts it and releases a result that still arrives', async () => {
    const draft = new ScreenshotAnnotationDraft()
    const fake = fakeAdapter()
    draft.requestCapture(launchFor('chat-a'), fake.adapter, pendingUploads().upload, () => {})
    draft.cancel()
    expect(fake.signals[0]?.aborted).toBe(true)
    const late = appPixels('late.png')
    fake.captures[0]?.resolve(late)
    await flush()
    expect(draft.getSnapshot().phase).toBe('idle')
    expect(draft.getPreviewFile()).toBeNull()
    expect(fake.released).toEqual([late])
  })

  it('cancels an upload and never delivers a completion that comes after', async () => {
    const draft = new ScreenshotAnnotationDraft()
    const { fake, uploads, notes, pixels } = await captured(draft)
    draft.confirm()
    draft.cancel()
    expect(uploads.calls[0]?.signal?.aborted).toBe(true)
    uploads.calls[0]?.done.resolve(KEPT)
    await flush()
    expect(notes).toEqual([])
    expect(fake.released).toEqual([pixels])
    expect(draft.getSnapshot().phase).toBe('idle')
  })

  it('on unmount releases a crop that finishes later and delivers nothing', async () => {
    const draft = new ScreenshotAnnotationDraft()
    const { fake, uploads, notes, pixels } = await captured(draft)
    const mapping = previewCropMapping(pixels.image, {
      width: 400,
      height: 300,
    }) as ScreenshotCropMapping
    draft.applyCrop({ x: 0, y: 0, width: 100, height: 100 }, mapping)
    draft.confirm()
    draft.dispose()
    const lateCrop = appPixels('late-crop.png')
    fake.crops[0]?.resolve(lateCrop)
    await flush()
    expect(uploads.upload).not.toHaveBeenCalled()
    expect(notes).toEqual([])
    expect(fake.released).toEqual(expect.arrayContaining([pixels, lateCrop]))
  })

  it('after unmount releases a capture that finishes later', async () => {
    const draft = new ScreenshotAnnotationDraft()
    const fake = fakeAdapter()
    draft.requestCapture(launchFor('chat-a'), fake.adapter, pendingUploads().upload, () => {})
    draft.dispose()
    const late = appPixels('late.png')
    fake.captures[0]?.resolve(late)
    await flush()
    expect(fake.released).toEqual([late])
  })
})
