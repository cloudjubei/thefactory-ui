import { CHAT_ATTACHMENT_MAX_BYTES } from 'thefactory-tools/constants'
import { describe, expect, it, vi } from 'vitest'
import { ChatAttachmentUploadError } from '../api/chatAttachmentUpload'
import type {
  ChatAttachmentFile,
  ChatAttachmentUploadOptions,
  UploadChatFile,
} from '../api/chatAttachmentUploadTypes'
import type { ChatContext } from '../api/generated'
import {
  ChatAttachmentUploadStore,
  chatUploadFailureText,
  chatUploadLine,
  fixedChatUploads,
  isChatUploading,
  nextUploadRate,
  uploadSecondsLeft,
  uploadTimeLeftText,
} from './chatAttachmentUploads'
import type { ChatAttachmentUpload } from './chatAttachmentUploadTypes'

const CHAT_A = { type: 'PROJECT', projectId: 'a' } as ChatContext
const CHAT_B = { type: 'PROJECT', projectId: 'b' } as ChatContext
const VIDEO: ChatAttachmentFile = { name: 'walk.mp4', size: 1000, blob: new Blob(['x']) }

type Pending = {
  context: ChatContext
  file: ChatAttachmentFile
  options: ChatAttachmentUploadOptions
  resolve: (path: string) => void
  reject: (err: unknown) => void
}

function fakeSender() {
  const sent: Pending[] = []
  const send: UploadChatFile = (context, file, options = {}) =>
    new Promise((resolve, reject) => sent.push({ context, file, options, resolve, reject }))
  return { sent, send }
}

const settled = () => new Promise((resolve) => setTimeout(resolve, 0))

function storeWith(now = () => 0) {
  const { sent, send } = fakeSender()
  return { sent, store: new ChatAttachmentUploadStore(send, now) }
}

describe('ChatAttachmentUploadStore', () => {
  it('shows a file as uploading the moment it is attached', () => {
    const { store, sent } = storeWith()
    const chat = store.forChat(CHAT_A, vi.fn())
    chat.attach([VIDEO])
    expect(chat.getUploads()).toMatchObject([
      { name: 'walk.mp4', status: 'uploading', sizeBytes: 1000, percent: 0 },
    ])
    expect(sent[0]?.file).toBe(VIDEO)
  })

  it('adds the path to the chat it was attached to, then drops the upload', async () => {
    const { store, sent } = storeWith()
    const add = vi.fn()
    const chat = store.forChat(CHAT_A, add)
    chat.attach([VIDEO])
    sent[0]?.resolve('kept/walk.mp4')
    await settled()
    expect(add).toHaveBeenCalledWith('kept/walk.mp4')
    expect(chat.getUploads()).toEqual([])
  })

  it('keeps Send held until the path is in the draft, never a moment between', async () => {
    const { store, sent } = storeWith()
    const seen: boolean[] = []
    const chat = store.forChat(CHAT_A, () => seen.push(isChatUploading(chat.getUploads())))
    chat.attach([VIDEO])
    sent[0]?.resolve('kept/walk.mp4')
    await settled()
    expect(seen).toEqual([true])
  })

  it('tells the caller each file as it arrives', async () => {
    const { store, sent } = storeWith()
    const onAttached = vi.fn()
    store.forChat(CHAT_A, vi.fn()).attach([VIDEO], onAttached)
    sent[0]?.resolve('kept/walk.mp4')
    await settled()
    expect(onAttached).toHaveBeenCalledWith('kept/walk.mp4', VIDEO)
  })

  it('keeps an upload going and in its own chat when another chat is opened', async () => {
    const { store, sent } = storeWith()
    const addA = vi.fn()
    const chatA = store.forChat(CHAT_A, addA)
    const chatB = store.forChat(CHAT_B, vi.fn())
    chatA.attach([VIDEO])
    expect(chatB.getUploads()).toEqual([])
    const reopened = store.forChat(CHAT_A, vi.fn())
    expect(reopened.getUploads()).toHaveLength(1)
    sent[0]?.resolve('kept/walk.mp4')
    await settled()
    expect(addA).toHaveBeenCalledWith('kept/walk.mp4')
  })

  it('reports percent, bytes and time left as bytes go', () => {
    let at = 0
    const { store, sent } = storeWith(() => at)
    const chat = store.forChat(CHAT_A, vi.fn())
    chat.attach([VIDEO])
    at = 1000
    sent[0]?.options.onProgress?.(250, 1000)
    expect(chat.getUploads()[0]).toMatchObject({ sentBytes: 250, percent: 25, secondsLeft: 3 })
  })

  it('does not redraw for every chunk', () => {
    let at = 1000
    const { store, sent } = storeWith(() => at)
    const chat = store.forChat(CHAT_A, vi.fn())
    chat.attach([VIDEO])
    const heard = vi.fn()
    chat.subscribe(heard)
    sent[0]?.options.onProgress?.(100, 1000)
    at += 50
    sent[0]?.options.onProgress?.(200, 1000)
    expect(heard).toHaveBeenCalledTimes(1)
    at += 200
    sent[0]?.options.onProgress?.(300, 1000)
    expect(heard).toHaveBeenCalledTimes(2)
  })

  it('takes the size from the upload when the picker did not know it', () => {
    const { store, sent } = storeWith(() => 1000)
    const chat = store.forChat(CHAT_A, vi.fn())
    chat.attach([{ name: 'a.mov', uri: 'file:///a.mov' }])
    expect(chat.getUploads()[0]).not.toHaveProperty('sizeBytes')
    sent[0]?.options.onProgress?.(10, 100)
    expect(chat.getUploads()[0]).toMatchObject({ sizeBytes: 100, percent: 10 })
  })

  it('refuses a file over the limit without sending it, and offers no retry', () => {
    const { store, sent } = storeWith()
    const chat = store.forChat(CHAT_A, vi.fn())
    chat.attach([{ name: 'big.mp4', size: CHAT_ATTACHMENT_MAX_BYTES + 1, blob: new Blob() }])
    expect(sent).toHaveLength(0)
    expect(chat.getUploads()[0]).toMatchObject({ status: 'failed', canRetry: false })
    expect(chat.getUploads()[0]?.error).toContain('2 GB')
  })

  it('says how far a dropped connection got, and offers another go', async () => {
    const { store, sent } = storeWith(() => 1000)
    const chat = store.forChat(CHAT_A, vi.fn())
    chat.attach([VIDEO])
    sent[0]?.options.onProgress?.(610, 1000)
    sent[0]?.reject(new ChatAttachmentUploadError('gone'))
    await settled()
    expect(chat.getUploads()[0]).toMatchObject({
      status: 'failed',
      error: 'The upload stopped at 61%.',
      canRetry: true,
    })
  })

  it('gives the percent reached even if the last chunk was not redrawn', async () => {
    let at = 1000
    const { store, sent } = storeWith(() => at)
    const chat = store.forChat(CHAT_A, vi.fn())
    chat.attach([VIDEO])
    sent[0]?.options.onProgress?.(100, 1000)
    at += 10
    sent[0]?.options.onProgress?.(900, 1000)
    sent[0]?.reject(new Error('socket'))
    await settled()
    expect(chat.getUploads()[0]?.error).toBe('The upload stopped at 90%.')
  })

  it('gives the backend’s reason, with no retry for a refused size', async () => {
    const { store, sent } = storeWith()
    const chat = store.forChat(CHAT_A, vi.fn())
    chat.attach([VIDEO])
    sent[0]?.reject(new ChatAttachmentUploadError('Too large.', 413))
    await settled()
    expect(chat.getUploads()[0]).toMatchObject({ error: 'Too large.', canRetry: false })
  })

  it('offers a retry for any other refusal', async () => {
    const { store, sent } = storeWith()
    const chat = store.forChat(CHAT_A, vi.fn())
    chat.attach([VIDEO])
    sent[0]?.reject(new ChatAttachmentUploadError('Starting.', 503))
    await settled()
    expect(chat.getUploads()[0]).toMatchObject({ error: 'Starting.', canRetry: true })
  })

  it('sends the same file again on retry, from the start', async () => {
    const { store, sent } = storeWith()
    const add = vi.fn()
    const chat = store.forChat(CHAT_A, add)
    chat.attach([VIDEO])
    sent[0]?.reject(new Error('socket'))
    await settled()
    const id = chat.getUploads()[0]?.id ?? ''
    chat.retry(id)
    expect(chat.getUploads()[0]).toMatchObject({ status: 'uploading', percent: 0 })
    expect(chat.getUploads()[0]).not.toHaveProperty('error')
    expect(sent[1]?.file).toBe(VIDEO)
    sent[1]?.resolve('kept/walk.mp4')
    await settled()
    expect(add).toHaveBeenCalledWith('kept/walk.mp4')
  })

  it('aborts on stop and adds nothing, even if the answer still comes', async () => {
    const { store, sent } = storeWith()
    const add = vi.fn()
    const chat = store.forChat(CHAT_A, add)
    chat.attach([VIDEO])
    chat.stop(chat.getUploads()[0]?.id ?? '')
    expect(sent[0]?.options.signal?.aborted).toBe(true)
    expect(chat.getUploads()).toEqual([])
    sent[0]?.resolve('kept/walk.mp4')
    await settled()
    expect(add).not.toHaveBeenCalled()
  })

  it('shows no failure for an upload that was stopped', async () => {
    const { store, sent } = storeWith()
    const chat = store.forChat(CHAT_A, vi.fn())
    chat.attach([VIDEO])
    chat.stop(chat.getUploads()[0]?.id ?? '')
    sent[0]?.reject(new Error('canceled'))
    await settled()
    expect(chat.getUploads()).toEqual([])
  })

  it('drops a failed upload on dismiss', async () => {
    const { store, sent } = storeWith()
    const chat = store.forChat(CHAT_A, vi.fn())
    chat.attach([VIDEO])
    sent[0]?.reject(new Error('socket'))
    await settled()
    chat.dismiss(chat.getUploads()[0]?.id ?? '')
    expect(chat.getUploads()).toEqual([])
  })

  it('keeps the same array until something changes, as useSyncExternalStore needs', () => {
    const { store } = storeWith()
    const chat = store.forChat(CHAT_A, vi.fn())
    expect(chat.getUploads()).toBe(chat.getUploads())
    chat.attach([VIDEO])
    expect(chat.getUploads()).toBe(chat.getUploads())
  })

  it('stops telling a listener once it unsubscribes, and tells only its own chat', () => {
    const { store } = storeWith()
    const chatA = store.forChat(CHAT_A, vi.fn())
    const chatB = store.forChat(CHAT_B, vi.fn())
    const heardA = vi.fn()
    const heardB = vi.fn()
    const off = chatA.subscribe(heardA)
    chatB.subscribe(heardB)
    chatA.attach([VIDEO])
    expect(heardA).toHaveBeenCalledTimes(1)
    expect(heardB).not.toHaveBeenCalled()
    off()
    chatA.attach([VIDEO])
    expect(heardA).toHaveBeenCalledTimes(1)
  })
})

describe('nextUploadRate', () => {
  it('leaves the speed alone until enough time has passed to measure one', () => {
    const rate = { atMs: 0, sentBytes: 0 }
    expect(nextUploadRate(rate, 100, 500)).toBe(rate)
  })

  it('takes the first sample as it is, then smooths', () => {
    const first = nextUploadRate({ atMs: 0, sentBytes: 0 }, 1000, 1000)
    expect(first.bytesPerSecond).toBe(1000)
    const second = nextUploadRate(first, 2000, 3000)
    expect(second.bytesPerSecond).toBeCloseTo(1200)
  })
})

describe('uploadSecondsLeft', () => {
  const rate = { atMs: 0, sentBytes: 0, bytesPerSecond: 100 }

  it('divides what is left by the speed', () => {
    expect(uploadSecondsLeft(100, 1100, rate)).toBe(10)
  })

  it('knows nothing without a size or a speed', () => {
    expect(uploadSecondsLeft(100, undefined, rate)).toBeUndefined()
    expect(uploadSecondsLeft(100, 1000, { atMs: 0, sentBytes: 0 })).toBeUndefined()
  })

  it('never goes below zero', () => {
    expect(uploadSecondsLeft(2000, 1000, rate)).toBe(0)
  })
})

describe('uploadTimeLeftText', () => {
  it.each([
    [59, 'under a minute left'],
    [60, 'about 1 min left'],
    [61, 'about 2 min left'],
    [3599, 'about 60 min left'],
    [3600, 'about 1 hr left'],
    [7300, 'about 3 hr left'],
  ])('%d seconds reads "%s"', (seconds, text) => {
    expect(uploadTimeLeftText(seconds)).toBe(text)
  })
})

describe('chatUploadLine', () => {
  const upload: ChatAttachmentUpload = {
    id: 'u',
    name: 'a.mp4',
    status: 'uploading',
    sentBytes: 1024 * 1024,
    sizeBytes: 2 * 1024 * 1024,
    percent: 50,
    canRetry: true,
  }

  it('says how far of how much, and the time left once it is known', () => {
    expect(chatUploadLine(upload)).toEqual({ progress: '1 MB of 2 MB · 50%' })
    expect(chatUploadLine({ ...upload, secondsLeft: 90 })).toEqual({
      progress: '1 MB of 2 MB · 50%',
      timeLeft: 'about 2 min left',
    })
  })

  it('falls back to the percent when the size is not known', () => {
    const { sizeBytes: _size, ...unsized } = upload
    expect(chatUploadLine(unsized).progress).toBe('50%')
  })
})

describe('chatUploadFailureText', () => {
  const failed = { name: 'a.png', status: 'failed' } as ChatAttachmentUpload

  it('names the file before why it failed', () => {
    expect(chatUploadFailureText({ ...failed, error: 'The upload failed.' })).toBe(
      'a.png: The upload failed.',
    )
  })

  it('does not name it twice', () => {
    const error = 'a.png is 3.0 GB — attachments can be up to 2 GB.'
    expect(chatUploadFailureText({ ...failed, error })).toBe(error)
  })

  it('falls back to the name alone', () => {
    expect(chatUploadFailureText(failed)).toBe('a.png')
  })
})

describe('isChatUploading', () => {
  const failed = { status: 'failed' } as ChatAttachmentUpload
  const going = { status: 'uploading' } as ChatAttachmentUpload

  it('holds Send only for a file on its way, not for one that failed', () => {
    expect(isChatUploading([])).toBe(false)
    expect(isChatUploading([failed])).toBe(false)
    expect(isChatUploading([failed, going])).toBe(true)
  })
})

describe('fixedChatUploads', () => {
  it('shows what it was given and goes nowhere', () => {
    const uploads = [{ id: 'u' } as ChatAttachmentUpload]
    const fixed = fixedChatUploads(uploads)
    expect(fixed.getUploads()).toBe(uploads)
    fixed.subscribe(vi.fn())()
    fixed.attach([])
    fixed.stop('u')
    fixed.dismiss('u')
    fixed.retry('u')
    expect(fixed.getUploads()).toBe(uploads)
  })
})
