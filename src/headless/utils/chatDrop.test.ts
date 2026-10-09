import { describe, expect, it } from 'vitest'
import {
  attachmentUploadError,
  chatDropAction,
  chatDropOverlay,
  currentChatDropTarget,
  isFileDrag,
  isImageAttachment,
} from './chatDrop'
import { CHAT_DROP_TEXT } from './chatDropConstants'
import type { ChatDropInput, ChatDropTargetInfo } from './chatDropTypes'

const story: ChatDropTargetInfo = { id: 'a', title: 'Story 3 chat', lastActiveAt: 10 }
const general: ChatDropTargetInfo = { id: 'b', title: 'General', lastActiveAt: 20 }

const idle: ChatDropInput = { dragging: true, shiftKey: false, over: null, current: null }

describe('isFileDrag', () => {
  it('is a file drag when the OS hands over files', () => {
    expect(isFileDrag(['Files'])).toBe(true)
    expect(isFileDrag(['text/uri-list', 'Files'])).toBe(true)
  })

  it('is not for an internal drag', () => {
    expect(isFileDrag(['text/plain'])).toBe(false)
    expect(isFileDrag(['application/x-project'])).toBe(false)
    expect(isFileDrag([])).toBe(false)
  })

  it('is not when there is no drag data', () => {
    expect(isFileDrag(undefined)).toBe(false)
    expect(isFileDrag(null)).toBe(false)
  })
})

describe('currentChatDropTarget', () => {
  it('picks the chat most recently focused', () => {
    expect(currentChatDropTarget([story, general])).toBe(general)
    expect(currentChatDropTarget([general, story])).toBe(general)
  })

  it('is null with no chat open', () => {
    expect(currentChatDropTarget([])).toBeNull()
  })
})

describe('chatDropOverlay', () => {
  it('is hidden when no files are dragged', () => {
    expect(chatDropOverlay({ ...idle, dragging: false, over: story })).toEqual({ visible: false })
  })

  it('offers a plain drop over a chat panel', () => {
    expect(chatDropOverlay({ ...idle, over: story, current: general })).toEqual({
      visible: true,
      placement: 'over-chat',
      message: CHAT_DROP_TEXT.dropHere,
      willAttach: true,
      targetId: 'a',
    })
  })

  it('asks for Shift elsewhere', () => {
    expect(chatDropOverlay({ ...idle, current: general })).toEqual({
      visible: true,
      placement: 'elsewhere',
      message: CHAT_DROP_TEXT.holdShift,
      willAttach: false,
    })
  })

  it('names the chat a Shift-drop goes to while Shift is held', () => {
    expect(chatDropOverlay({ ...idle, shiftKey: true, current: general })).toEqual({
      visible: true,
      placement: 'elsewhere',
      message: CHAT_DROP_TEXT.releaseTo('General'),
      willAttach: true,
      targetId: 'b',
    })
  })

  it('says no chat is open when there is none, Shift or not', () => {
    for (const shiftKey of [false, true]) {
      expect(chatDropOverlay({ ...idle, shiftKey })).toEqual({
        visible: true,
        placement: 'elsewhere',
        message: CHAT_DROP_TEXT.noChat,
        willAttach: false,
      })
    }
  })
})

describe('chatDropAction', () => {
  it('attaches a drop over a chat panel to that chat', () => {
    expect(chatDropAction({ ...idle, over: story, current: general })).toEqual({
      kind: 'attach',
      targetId: 'a',
    })
  })

  it('attaches a Shift-drop elsewhere to the current chat', () => {
    expect(chatDropAction({ ...idle, shiftKey: true, current: story })).toEqual({
      kind: 'attach',
      targetId: 'a',
    })
  })

  it('swallows a plain drop elsewhere', () => {
    expect(chatDropAction({ ...idle, current: story })).toEqual({ kind: 'swallow' })
  })

  it('swallows a Shift-drop with no chat open', () => {
    expect(chatDropAction({ ...idle, shiftKey: true })).toEqual({ kind: 'swallow' })
  })
})

describe('isImageAttachment', () => {
  it('knows the images an agent can view', () => {
    for (const name of [
      'a.png',
      'b.JPG',
      'c.jpeg',
      'd.gif',
      'e.webp',
      '.factory/attachments/x/1a2b-f.png',
    ]) {
      expect(isImageAttachment(name)).toBe(true)
    }
  })

  it('is false for anything else', () => {
    for (const name of ['a.pdf', 'b.svg', 'notes.md', 'png', 'archive.png.zip']) {
      expect(isImageAttachment(name)).toBe(false)
    }
  })
})

describe('attachmentUploadError', () => {
  const MAX = 25 * 1024 * 1024

  it('accepts a file up to the limit', () => {
    expect(attachmentUploadError({ name: 'a.bin', size: MAX }, MAX)).toBeUndefined()
    expect(attachmentUploadError({ name: 'empty.txt', size: 0 }, MAX)).toBeUndefined()
  })

  it('names the file, its size and the limit when it is too large', () => {
    expect(attachmentUploadError({ name: 'video.mov', size: MAX + 1 }, MAX)).toBe(
      'video.mov is 25.0 MB — attachments can be up to 25 MB.',
    )
    expect(attachmentUploadError({ name: 'big.zip', size: 40 * 1024 * 1024 }, MAX)).toBe(
      'big.zip is 40.0 MB — attachments can be up to 25 MB.',
    )
  })
})
