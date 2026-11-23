import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { UploadChatFile } from '../api/chatAttachmentUploadTypes'
import type { AppNote } from '../utils/appNotesTypes'
import { SCREENSHOT_ANNOTATION_TEXT } from '../utils/screenshotAnnotationConstants'
import { ScreenshotAnnotationDraft } from '../utils/screenshotAnnotationDraft'
import type {
  ScreenshotAnnotationComposer,
  ScreenshotLaunch,
} from '../utils/screenshotAnnotationTypes'
import {
  appPixels,
  deferred,
  fakeAdapter,
  flush,
  launchFor,
} from '../utils/testUtils/screenshotAnnotationFakes'
import { useScreenshotAnnotation } from './useScreenshotAnnotation'

const KEPT = '.factory/attachments/chat-a/shot.png'

afterEach(() => {
  cleanup()
})

describe('useScreenshotAnnotation', () => {
  it('is nothing at all when the host offers no screenshot annotation', () => {
    const { result } = renderHook(() => useScreenshotAnnotation(undefined))
    expect(result.current).toBeNull()
  })

  it('says Capture is unavailable, with the reason, when no adapter is supplied', () => {
    const screenshot: ScreenshotAnnotationComposer = {
      launch: () => launchFor('chat-a'),
      upload: vi.fn<UploadChatFile>(),
      onNote: () => {},
    }
    const { result } = renderHook(() => useScreenshotAnnotation(screenshot))
    expect(result.current?.unavailableReason).toBe(SCREENSHOT_ANNOTATION_TEXT.noAdapter)
  })

  it('reads the launch once, at Capture, and hands the note to that chat after the host switches', async () => {
    const fake = fakeAdapter()
    const done = deferred<string>()
    let current = launchFor('chat-a')
    const delivered: { note: AppNote; launch: ScreenshotLaunch }[] = []
    const screenshot: ScreenshotAnnotationComposer = {
      adapter: fake.adapter,
      launch: () => current,
      upload: vi.fn<UploadChatFile>(() => done.promise),
      onNote: (note, launch) => delivered.push({ note, launch }),
    }
    const { result } = renderHook(() => useScreenshotAnnotation(screenshot))
    await act(async () => {
      await flush()
    })
    act(() => result.current?.capture())
    current = launchFor('chat-b', 'billing')
    await act(async () => {
      fake.captures[0]?.resolve(appPixels())
      await flush()
    })
    expect(result.current?.snapshot.phase).toBe('preview')
    expect(result.current?.previewFile).not.toBeNull()
    await act(async () => {
      result.current?.draft?.confirm()
      done.resolve(KEPT)
      await flush()
    })
    expect(screenshot.upload).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'chat-a' }),
      expect.anything(),
      expect.anything(),
    )
    expect(delivered).toHaveLength(1)
    expect(delivered[0]?.launch.context).toMatchObject({ id: 'chat-a' })
    expect(delivered[0]?.note).toMatchObject({ view: 'home' })
  })

  it('drops its own draft on unmount and releases a capture that finishes afterwards', async () => {
    const fake = fakeAdapter()
    const screenshot: ScreenshotAnnotationComposer = {
      adapter: fake.adapter,
      launch: () => launchFor('chat-a'),
      upload: vi.fn<UploadChatFile>(),
      onNote: vi.fn(),
    }
    const { result, unmount } = renderHook(() => useScreenshotAnnotation(screenshot))
    await act(async () => {
      await flush()
    })
    act(() => result.current?.capture())
    unmount()
    const late = appPixels('late.png')
    fake.captures[0]?.resolve(late)
    await flush()
    expect(fake.released).toEqual([late])
    expect(screenshot.onNote).not.toHaveBeenCalled()
  })

  it('leaves a draft the host keeps above the composer alive across unmount', async () => {
    const fake = fakeAdapter()
    const draft = new ScreenshotAnnotationDraft()
    const screenshot: ScreenshotAnnotationComposer = {
      adapter: fake.adapter,
      launch: () => launchFor('chat-a'),
      upload: vi.fn<UploadChatFile>(),
      onNote: vi.fn(),
      draft,
    }
    const { result, unmount } = renderHook(() => useScreenshotAnnotation(screenshot))
    act(() => result.current?.capture())
    unmount()
    fake.captures[0]?.resolve(appPixels())
    await flush()
    expect(draft.getSnapshot().phase).toBe('preview')
    expect(fake.released).toEqual([])
  })
})
