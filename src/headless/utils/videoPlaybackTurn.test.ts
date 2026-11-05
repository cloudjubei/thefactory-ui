import { afterEach, describe, expect, it, vi } from 'vitest'
import { takeVideoTurn } from './videoPlaybackTurn'

describe('takeVideoTurn', () => {
  let release = () => {}
  afterEach(() => release())

  it('stops the video that was playing', () => {
    const first = vi.fn()
    takeVideoTurn(first)
    release = takeVideoTurn(vi.fn())
    expect(first).toHaveBeenCalledTimes(1)
  })

  it('does not stop a video that gave its turn up', () => {
    const first = vi.fn()
    takeVideoTurn(first)()
    release = takeVideoTurn(vi.fn())
    expect(first).not.toHaveBeenCalled()
  })

  it('does not stop itself when it takes the turn again', () => {
    const stop = vi.fn()
    takeVideoTurn(stop)
    release = takeVideoTurn(stop)
    expect(stop).not.toHaveBeenCalled()
  })

  it('leaves the newer video playing when an older one lets go late', () => {
    const older = vi.fn()
    const newer = vi.fn()
    const releaseOlder = takeVideoTurn(older)
    release = takeVideoTurn(newer)
    releaseOlder()
    takeVideoTurn(vi.fn())
    expect(newer).toHaveBeenCalledTimes(1)
  })
})
