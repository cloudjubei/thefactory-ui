import { describe, expect, it, vi } from 'vitest'
import { AppPushChannel } from './appPushChannel'

describe('AppPushChannel', () => {
  it('hands each push to every subscriber', () => {
    const channel = new AppPushChannel()
    const a = vi.fn()
    const b = vi.fn()
    channel.subscribe(a)
    channel.subscribe(b)
    const msg = { type: 'overseer:data.changed', payload: { collection: 'c' } }
    channel.post(msg)
    expect(a).toHaveBeenCalledWith(msg)
    expect(b).toHaveBeenCalledWith(msg)
  })

  it('stops handing pushes to a subscriber that left', () => {
    const channel = new AppPushChannel()
    const a = vi.fn()
    const off = channel.subscribe(a)
    off()
    channel.post({ type: 'overseer:data.changed' })
    expect(a).not.toHaveBeenCalled()
  })

  it('drops a push nobody listens for', () => {
    expect(() => new AppPushChannel().post({ type: 'overseer:x' })).not.toThrow()
  })
})
