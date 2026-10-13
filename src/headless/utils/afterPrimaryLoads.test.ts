import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { afterPrimaryLoads } from './afterPrimaryLoads'

describe('afterPrimaryLoads', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('runs the load after everything already queued in this turn', () => {
    const order: string[] = []
    afterPrimaryLoads(() => order.push('secondary'))
    order.push('primary')
    expect(order).toEqual(['primary'])
    vi.runAllTimers()
    expect(order).toEqual(['primary', 'secondary'])
  })

  it('never runs a load cancelled before its turn', () => {
    const load = vi.fn()
    const cancel = afterPrimaryLoads(load)
    cancel()
    vi.runAllTimers()
    expect(load).not.toHaveBeenCalled()
  })

  it('runs each deferred load once', () => {
    const load = vi.fn()
    afterPrimaryLoads(load)
    vi.runAllTimers()
    vi.runAllTimers()
    expect(load).toHaveBeenCalledTimes(1)
  })
})
