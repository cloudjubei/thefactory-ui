import { afterEach, describe, expect, it, vi } from 'vitest'
import { sendChatAttachment } from '../api/chatAttachmentUpload'
import type { UploadChatFile } from '../api/chatAttachmentUploadTypes'
import { client } from '../api/generated/client.gen'
import type { AppNote } from './appNotesTypes'
import { ScreenshotAnnotationDraft } from './screenshotAnnotationDraft'
import {
  appPixels,
  deferred,
  fakeAdapter,
  flush,
  launchFor,
} from './testUtils/screenshotAnnotationFakes'

const KEPT = '.factory/attachments/chat-a/shot.png'

const upload: UploadChatFile = (context, file, options) =>
  sendChatAttachment({
    context,
    file,
    ...(options ? { options } : {}),
    apiBaseUrl: 'http://host',
    token: 't',
    sendFileFromUri: undefined,
  })

afterEach(() => {
  vi.restoreAllMocks()
})

async function previewing() {
  const draft = new ScreenshotAnnotationDraft()
  const fake = fakeAdapter()
  const notes: AppNote[] = []
  draft.requestCapture(launchFor('chat-a'), fake.adapter, upload, (note) => notes.push(note))
  const pixels = appPixels()
  fake.captures[0]?.resolve(pixels)
  await flush()
  return { draft, fake, notes, pixels }
}

describe('ScreenshotAnnotationDraft over the chat attachment upload', () => {
  it('posts the frozen image to the launching chat’s attachment route and keeps the returned path', async () => {
    const post = vi.spyOn(client.instance, 'post').mockResolvedValue({ data: { path: KEPT } })
    const { draft, notes, pixels } = await previewing()
    draft.confirm()
    await flush()
    expect(post).toHaveBeenCalledTimes(1)
    expect(post.mock.calls[0]?.[0]).toMatch(
      /^\/api\/v1\/projects\/p1\/chat-attachments\?name=shot\.png&/,
    )
    expect(decodeURIComponent(String(post.mock.calls[0]?.[0]))).toContain('"id":"chat-a"')
    expect(post.mock.calls[0]?.[1]).toBe('blob' in pixels.file ? pixels.file.blob : undefined)
    expect(notes[0]?.screenshotFile).toBe(KEPT)
  })

  it('turns a refused upload into a retriable failure, then retries to the same route', async () => {
    const post = vi
      .spyOn(client.instance, 'post')
      .mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 500, data: { error: 'Disk full.' } },
      })
      .mockResolvedValueOnce({ data: { path: KEPT } })
    const { draft, notes } = await previewing()
    draft.confirm()
    await flush()
    expect(draft.getSnapshot()).toMatchObject({
      phase: 'failed',
      error: 'Disk full.',
      canRetry: true,
    })
    draft.retry()
    await flush()
    expect(post.mock.calls[1]?.[0]).toBe(post.mock.calls[0]?.[0])
    expect(notes).toHaveLength(1)
  })

  it('aborts the request on cancel and drops a response that still comes back', async () => {
    const response = deferred<{ data: { path: string } }>()
    const post = vi.spyOn(client.instance, 'post').mockReturnValue(response.promise)
    const { draft, fake, notes, pixels } = await previewing()
    draft.confirm()
    await flush()
    const signal = post.mock.calls[0]?.[2]?.signal as AbortSignal | undefined
    draft.cancel()
    expect(signal?.aborted).toBe(true)
    response.resolve({ data: { path: KEPT } })
    await flush()
    expect(notes).toEqual([])
    expect(fake.released).toEqual([pixels])
    expect(draft.getSnapshot().phase).toBe('idle')
  })

  it('drops a response that comes back after unmount', async () => {
    const response = deferred<{ data: { path: string } }>()
    vi.spyOn(client.instance, 'post').mockReturnValue(response.promise)
    const { draft, fake, notes, pixels } = await previewing()
    draft.confirm()
    await flush()
    draft.dispose()
    response.resolve({ data: { path: KEPT } })
    await flush()
    expect(notes).toEqual([])
    expect(fake.released).toEqual([pixels])
  })
})
