import { describe, expect, it } from 'vitest'
import { isWsReopen } from './wsReconnect'

describe('isWsReopen', () => {
  it('is the socket coming back after it dropped — when broadcasts may have been missed', () => {
    expect(isWsReopen('closed', 'open')).toBe(true)
  })

  it('is not the first connection, which the initial load already covers', () => {
    expect(isWsReopen('connecting', 'open')).toBe(false)
    expect(isWsReopen('idle', 'open')).toBe(false)
  })

  it('is not a socket that stays open or goes down', () => {
    expect(isWsReopen('open', 'open')).toBe(false)
    expect(isWsReopen('open', 'closed')).toBe(false)
  })
})
