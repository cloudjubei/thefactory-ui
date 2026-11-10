import { describe, expect, it, vi } from 'vitest'
import { TICKET_CARD_TEXT } from '../utils/ticketCardConstants'
import type { TicketPreview } from '../utils/ticketCardTypes'
import { TicketPreviewStore, ticketPreviewStoreFor } from './ticketPreviewStore'

const preview = (key: string): TicketPreview => ({
  key,
  summary: `Title of ${key}`,
  url: `https://acme.atlassian.net/browse/${key}`,
})

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (err: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('TicketPreviewStore', () => {
  it('has asked for nothing until a key is requested', () => {
    const read = vi.fn()
    const store = new TicketPreviewStore(read)
    expect(store.getState('ZNR-1')).toEqual({ kind: 'idle' })
    expect(read).not.toHaveBeenCalled()
  })

  it('reads a key once: loading, then ready, and never asks again', async () => {
    const wait = deferred<TicketPreview>()
    const read = vi.fn(() => wait.promise)
    const store = new TicketPreviewStore(read)
    const heard = vi.fn()
    store.subscribe(heard)
    store.request('ZNR-1')
    expect(store.getState('ZNR-1')).toEqual({ kind: 'loading' })
    store.request('ZNR-1')
    wait.resolve(preview('ZNR-1'))
    await wait.promise
    await Promise.resolve()
    expect(store.getState('ZNR-1')).toEqual({ kind: 'ready', preview: preview('ZNR-1') })
    store.request('ZNR-1')
    expect(read).toHaveBeenCalledTimes(1)
    expect(heard).toHaveBeenCalledTimes(2)
  })

  it('keeps each key’s preview apart, whatever case the key was asked in', async () => {
    const read = vi.fn(async (key: string) => preview(key))
    const store = new TicketPreviewStore(read)
    store.request('znr-1')
    store.request('ENG-2')
    await vi.waitFor(() => expect(store.getState('ENG-2').kind).toBe('ready'))
    expect(read.mock.calls.map(([key]) => key)).toEqual(['ZNR-1', 'ENG-2'])
    expect(store.getState('ZNR-1')).toEqual({ kind: 'ready', preview: preview('ZNR-1') })
    expect(store.getState('OPS-3')).toEqual({ kind: 'idle' })
  })

  it('says a read that failed could not be read, and tries again when asked again', async () => {
    const read = vi
      .fn<(key: string) => Promise<TicketPreview>>()
      .mockRejectedValueOnce(new Error('Jira returned 503'))
      .mockResolvedValueOnce(preview('ZNR-1'))
    const store = new TicketPreviewStore(read)
    store.request('ZNR-1')
    await vi.waitFor(() => expect(store.getState('ZNR-1').kind).toBe('failed'))
    expect(store.getState('ZNR-1')).toEqual({ kind: 'failed', reason: TICKET_CARD_TEXT.failed })
    store.request('ZNR-1')
    expect(store.getState('ZNR-1')).toEqual({ kind: 'loading' })
    await vi.waitFor(() => expect(store.getState('ZNR-1').kind).toBe('ready'))
    expect(read).toHaveBeenCalledTimes(2)
  })

  it('answers the same state object until it changes, for a subscriber’s snapshot', () => {
    const store = new TicketPreviewStore(() => new Promise(() => undefined))
    expect(store.getState('ZNR-1')).toBe(store.getState('ZNR-2'))
    store.request('ZNR-1')
    expect(store.getState('ZNR-1')).toBe(store.getState('ZNR-1'))
  })

  it('stops telling a listener that left', async () => {
    const store = new TicketPreviewStore(async (key) => preview(key))
    const heard = vi.fn()
    const leave = store.subscribe(heard)
    leave()
    store.request('ZNR-1')
    await vi.waitFor(() => expect(store.getState('ZNR-1').kind).toBe('ready'))
    expect(heard).not.toHaveBeenCalled()
  })
})

describe('ticketPreviewStoreFor', () => {
  it('keeps one store per scope for the session, so a chat opened again reads nothing twice', () => {
    const read = vi.fn(async (key: string) => preview(key))
    const first = ticketPreviewStoreFor('group:g1', read)
    expect(ticketPreviewStoreFor('group:g1', vi.fn())).toBe(first)
    expect(ticketPreviewStoreFor('project:g1', read)).not.toBe(first)
  })
})
