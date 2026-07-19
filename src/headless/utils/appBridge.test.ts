import { describe, expect, it } from 'vitest'
import {
  BRIDGE_PREFIX,
  bridgeMessageName,
  buildBridgeResponse,
  buildNavOpenMessage,
  parseBridgeMessage,
} from './appBridge'

describe('parseBridgeMessage', () => {
  it('accepts a well-formed object message', () => {
    const req = parseBridgeMessage({ type: 'overseer:toast', id: 'x', payload: { message: 'hi' } })
    expect(req).toEqual({ type: 'overseer:toast', id: 'x', payload: { message: 'hi' } })
  })

  it('accepts a JSON string (native WebView path)', () => {
    const req = parseBridgeMessage(JSON.stringify({ type: 'overseer:ready' }))
    expect(req).toEqual({ type: 'overseer:ready' })
  })

  it('omits id when absent and preserves an explicit null payload', () => {
    const req = parseBridgeMessage({ type: 'overseer:data.query', payload: null })
    expect(req).toEqual({ type: 'overseer:data.query', payload: null })
    expect(req && 'id' in req).toBe(false)
  })

  it('rejects messages without the overseer prefix', () => {
    expect(parseBridgeMessage({ type: 'other:thing' })).toBeNull()
    expect(parseBridgeMessage({ type: 'ready' })).toBeNull()
  })

  it('rejects non-objects, missing type, and unparseable strings', () => {
    expect(parseBridgeMessage(null)).toBeNull()
    expect(parseBridgeMessage(42)).toBeNull()
    expect(parseBridgeMessage({})).toBeNull()
    expect(parseBridgeMessage({ type: 123 })).toBeNull()
    expect(parseBridgeMessage('not json')).toBeNull()
  })
})

describe('bridgeMessageName', () => {
  it('strips the prefix', () => {
    expect(bridgeMessageName('overseer:toast')).toBe('toast')
    expect(bridgeMessageName('overseer:data.put')).toBe('data.put')
  })
  it('returns the input unchanged when unprefixed', () => {
    expect(bridgeMessageName('toast')).toBe('toast')
  })
})

describe('buildBridgeResponse', () => {
  it('builds an ok response carrying the result + correlation id', () => {
    const res = buildBridgeResponse({ type: 'overseer:data.query', id: 'q1' }, { result: [1, 2] })
    expect(res).toEqual({ overseerBridgeResponse: true, ok: true, id: 'q1', result: [1, 2] })
  })

  it('builds an error response', () => {
    const res = buildBridgeResponse({ type: 'overseer:data.put', id: 'p1' }, { error: 'nope' })
    expect(res).toEqual({ overseerBridgeResponse: true, ok: false, id: 'p1', error: 'nope' })
  })

  it('omits id when the request had none', () => {
    const res = buildBridgeResponse({ type: 'overseer:ready' }, { result: undefined })
    expect(res.id).toBeUndefined()
    expect(res.ok).toBe(true)
  })

  it('exposes the prefix constant', () => {
    expect(BRIDGE_PREFIX).toBe('overseer:')
  })

  it('builds a fire-and-forget nav.open PUSH (typed message, no id) that round-trips as a request', () => {
    const dl = { view: 'runs', params: { run: 'r1' } }
    const msg = buildNavOpenMessage(dl)
    expect(msg).toEqual({ type: 'overseer:nav.open', payload: dl })
    expect(msg.id).toBeUndefined()
    // A pushed request is still a valid bridge REQUEST (the app routes it by name) and NOT a response.
    expect(parseBridgeMessage(msg)).toEqual({ type: 'overseer:nav.open', payload: dl })
    expect((msg as { overseerBridgeResponse?: unknown }).overseerBridgeResponse).toBeUndefined()
    expect(bridgeMessageName(msg.type)).toBe('nav.open')
  })
})
