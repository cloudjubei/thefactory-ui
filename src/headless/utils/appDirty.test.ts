import { describe, expect, it } from 'vitest'
import { appDirtyLeaveMessage, isAppDirtyRequest, parseAppDirtyPayload } from './appDirty'
import { parseBridgeMessage } from './appBridge'
import { APP_DIRTY_DEFAULT_MESSAGE, APP_DIRTY_TYPE } from './appDirtyConstants'

describe('APP_DIRTY_TYPE', () => {
  it('is the prefixed bridge message name', () => {
    expect(APP_DIRTY_TYPE).toBe('overseer:app.dirty')
  })
})

describe('isAppDirtyRequest', () => {
  it('matches the app.dirty message as the bridge parses it from an iframe object', () => {
    const req = parseBridgeMessage({ type: 'overseer:app.dirty', payload: { dirty: true } })
    expect(req && isAppDirtyRequest(req)).toBe(true)
  })

  it('matches the app.dirty message as the bridge parses it from a WebView string', () => {
    const req = parseBridgeMessage(
      JSON.stringify({ type: 'overseer:app.dirty', payload: { dirty: false } }),
    )
    expect(req && isAppDirtyRequest(req)).toBe(true)
  })

  it('does not match other bridge messages or a look-alike name', () => {
    expect(isAppDirtyRequest({ type: 'overseer:app.capabilities', payload: { dirty: true } })).toBe(
      false,
    )
    expect(isAppDirtyRequest({ type: 'overseer:app.dirty.extra' })).toBe(false)
    expect(isAppDirtyRequest({ type: 'app.dirty' })).toBe(false)
  })
})

describe('parseAppDirtyPayload', () => {
  it('reads dirty with no message', () => {
    expect(parseAppDirtyPayload({ dirty: true })).toEqual({ dirty: true })
    expect(parseAppDirtyPayload({ dirty: false })).toEqual({ dirty: false })
  })

  it('keeps a trimmed message', () => {
    expect(parseAppDirtyPayload({ dirty: true, message: '  2 scenarios not saved.  ' })).toEqual({
      dirty: true,
      message: '2 scenarios not saved.',
    })
  })

  it('drops a blank or non-string message', () => {
    expect(parseAppDirtyPayload({ dirty: true, message: '   ' })).toEqual({ dirty: true })
    expect(parseAppDirtyPayload({ dirty: true, message: 42 })).toEqual({ dirty: true })
    expect(parseAppDirtyPayload({ dirty: true, message: null })).toEqual({ dirty: true })
  })

  it('ignores extra fields', () => {
    expect(parseAppDirtyPayload({ dirty: false, at: 1, scope: 'editor' })).toEqual({ dirty: false })
  })

  it('rejects a payload without a boolean dirty', () => {
    expect(parseAppDirtyPayload({})).toBeNull()
    expect(parseAppDirtyPayload({ dirty: 'true' })).toBeNull()
    expect(parseAppDirtyPayload({ dirty: 1 })).toBeNull()
    expect(parseAppDirtyPayload({ message: 'unsaved' })).toBeNull()
  })

  it('rejects a payload that is not an object', () => {
    expect(parseAppDirtyPayload(undefined)).toBeNull()
    expect(parseAppDirtyPayload(null)).toBeNull()
    expect(parseAppDirtyPayload(true)).toBeNull()
    expect(parseAppDirtyPayload('{"dirty":true}')).toBeNull()
    expect(parseAppDirtyPayload([true])).toBeNull()
  })
})

describe('appDirtyLeaveMessage', () => {
  it('is null when nothing is unsaved', () => {
    expect(appDirtyLeaveMessage(null)).toBeNull()
    expect(appDirtyLeaveMessage({ dirty: false })).toBeNull()
    expect(appDirtyLeaveMessage({ dirty: false, message: 'Unsaved' })).toBeNull()
  })

  it("is the app's own message while dirty", () => {
    expect(appDirtyLeaveMessage({ dirty: true, message: '2 scenarios not saved.' })).toBe(
      '2 scenarios not saved.',
    )
  })

  it('falls back to the default message while dirty without one', () => {
    expect(appDirtyLeaveMessage({ dirty: true })).toBe(APP_DIRTY_DEFAULT_MESSAGE)
    expect(APP_DIRTY_DEFAULT_MESSAGE).toBe('This app has unsaved changes. Leave anyway?')
  })
})
