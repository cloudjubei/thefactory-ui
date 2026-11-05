import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatVideoMediaLease } from './ChatVideoMediaLease'

const NOW = new Date('2026-11-05T12:00:00.000Z').getTime()
const inMinutes = (minutes: number) => new Date(NOW + minutes * 60_000).toISOString()

const urls = (name: string, still?: string, minutes = 15) => ({
  url: `/media?${name}`,
  ...(still ? { stillUrl: `/media?${still}` } : {}),
  expiresAt: inMinutes(minutes),
})

beforeEach(() => {
  vi.useFakeTimers({ now: NOW, toFake: ['Date'] })
})
afterEach(() => {
  vi.useRealTimers()
})

describe('ChatVideoMediaLease', () => {
  it('asks once for the still and the video together', async () => {
    const read = vi.fn().mockResolvedValue(urls('v', 's'))
    const lease = new ChatVideoMediaLease(read, 'http://host')
    expect(await lease.stillUrl('poster.jpg')).toBe('http://host/media?s')
    expect(await lease.video()).toEqual({
      url: 'http://host/media?v',
      expiresAt: inMinutes(15),
    })
    expect(read).toHaveBeenCalledTimes(1)
    expect(read).toHaveBeenCalledWith('poster.jpg')
  })

  it('puts a URL on the server, however its base is written', async () => {
    const lease = new ChatVideoMediaLease(async () => urls('v'), 'http://host/')
    expect((await lease.video())?.url).toBe('http://host/media?v')
  })

  it('asks again when the poster changes', async () => {
    const read = vi.fn().mockResolvedValueOnce(urls('v', 'a')).mockResolvedValueOnce(urls('v', 'b'))
    const lease = new ChatVideoMediaLease(read, 'http://host')
    await lease.stillUrl('a.jpg')
    expect(await lease.stillUrl('b.jpg')).toBe('http://host/media?b')
  })

  it('has no still before there is a poster, but holds the video’s URL ready', async () => {
    const read = vi.fn().mockResolvedValue(urls('v'))
    const lease = new ChatVideoMediaLease(read, 'http://host')
    expect(await lease.stillUrl(undefined)).toBeNull()
    await lease.video()
    expect(read).toHaveBeenCalledTimes(1)
    expect(read).toHaveBeenCalledWith(undefined)
  })

  it('asks again for a video whose URL has nearly run out', async () => {
    const read = vi.fn().mockResolvedValueOnce(urls('old')).mockResolvedValueOnce(urls('new'))
    const lease = new ChatVideoMediaLease(read, 'http://host')
    await lease.video()
    vi.setSystemTime(NOW + 14.9 * 60_000)
    expect((await lease.video())?.url).toBe('http://host/media?new')
  })

  it('keeps asking with the poster it was last shown', async () => {
    const read = vi.fn().mockResolvedValue(urls('v', 's'))
    const lease = new ChatVideoMediaLease(read, 'http://host')
    await lease.stillUrl('a.jpg')
    vi.setSystemTime(NOW + 20 * 60_000)
    await lease.video()
    expect(read).toHaveBeenLastCalledWith('a.jpg')
  })

  it('gives nothing when the server refuses, and tries again next time', async () => {
    const read = vi.fn().mockRejectedValueOnce(new Error('404')).mockResolvedValueOnce(urls('v'))
    const lease = new ChatVideoMediaLease(read, 'http://host')
    expect(await lease.video()).toBeNull()
    expect((await lease.video())?.url).toBe('http://host/media?v')
  })

  it('has no still when the server refuses', async () => {
    const lease = new ChatVideoMediaLease(() => Promise.reject(new Error('404')), 'http://host')
    expect(await lease.stillUrl('a.jpg')).toBeNull()
  })

  it('leaves a URL that is whole already as it is', async () => {
    const lease = new ChatVideoMediaLease(
      async () => ({ url: 'data:video/webm;base64,AAAA', expiresAt: inMinutes(60) }),
      null,
    )
    expect((await lease.video())?.url).toBe('data:video/webm;base64,AAAA')
  })
})
