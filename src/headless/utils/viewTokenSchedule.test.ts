import { describe, expect, it } from 'vitest'
import { computeRefreshDelayMs } from './viewTokenSchedule'

describe('computeRefreshDelayMs', () => {
  const now = Date.parse('2026-05-30T12:00:00.000Z')

  it('schedules refresh `leadMs` before expiry when there is time', () => {
    const expiresAt = new Date(now + 15 * 60_000).toISOString() // 15min from now
    const delay = computeRefreshDelayMs({ expiresAt, leadMs: 60_000, now })
    expect(delay).toBe(15 * 60_000 - 60_000) // 14min in ms
  })

  it('returns 0 when expiry is within the lead window', () => {
    const expiresAt = new Date(now + 30_000).toISOString() // 30s — less than lead
    const delay = computeRefreshDelayMs({ expiresAt, leadMs: 60_000, now })
    expect(delay).toBe(0)
  })

  it('returns 0 when the token is already expired', () => {
    const expiresAt = new Date(now - 60_000).toISOString()
    const delay = computeRefreshDelayMs({ expiresAt, leadMs: 60_000, now })
    expect(delay).toBe(0)
  })

  it('returns null when expiresAt is unparseable', () => {
    const delay = computeRefreshDelayMs({ expiresAt: 'not-a-date', leadMs: 60_000, now })
    expect(delay).toBeNull()
  })

  it('returns null when leadMs is negative', () => {
    const expiresAt = new Date(now + 5 * 60_000).toISOString()
    const delay = computeRefreshDelayMs({ expiresAt, leadMs: -1, now })
    expect(delay).toBeNull()
  })

  it('defaults `now` to Date.now() when omitted', () => {
    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString()
    const delay = computeRefreshDelayMs({ expiresAt, leadMs: 60_000 })
    // Between ~4min and 5min, never exact (race between Date.now() calls).
    expect(delay).toBeGreaterThan(3 * 60_000)
    expect(delay).toBeLessThanOrEqual(5 * 60_000 - 60_000)
  })
})
