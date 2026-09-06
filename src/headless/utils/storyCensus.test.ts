import { describe, expect, it } from 'vitest'
import { censusFeatures, incompleteStoryReason } from './storyCensus'
import type { Feature } from '../api/generated'

const f = (status: string): Feature => ({ status }) as unknown as Feature

describe('censusFeatures (UI copy — must agree with thefactory-tools)', () => {
  it('is complete only when nothing is outstanding', () => {
    expect(censusFeatures([f('done'), f('done')]).complete).toBe(true)
    expect(censusFeatures([f('done'), f('pending')]).complete).toBe(false)
    expect(censusFeatures([f('done'), f('blocked')]).complete).toBe(false)
    expect(censusFeatures([f('done'), f('in_progress')]).complete).toBe(false)
  })

  it('treats deferred as settled, matching the server-side rule', () => {
    const c = censusFeatures([f('done'), f('deferred')])
    expect(c.complete).toBe(true)
    expect(c.outstanding).toBe(0)
    expect(c.label).toMatch(/deferred/)
  })

  it('is NOT complete for a story with no features', () => {
    expect(censusFeatures([]).complete).toBe(false)
  })

  it('labels progress for the header', () => {
    expect(censusFeatures([f('done'), f('pending')]).label).toBe('1 of 2 features done')
    expect(censusFeatures([f('done')]).label).toBe('1 of 1 feature done')
  })

  it('normalises legacy symbol statuses', () => {
    const c = censusFeatures([f('+'), f('-')])
    expect(c.done).toBe(1)
    expect(c.pending).toBe(1)
  })

  it('ignores a status it does not recognise rather than miscounting it as done', () => {
    const c = censusFeatures([f('done'), f('wat')])
    expect(c.done).toBe(1)
    expect(c.complete).toBe(false)
  })
})

describe('incompleteStoryReason', () => {
  it('names what is unfinished', () => {
    const reason = incompleteStoryReason(censusFeatures([f('done'), f('pending'), f('blocked')]))
    expect(reason).toContain('2 of 3')
    expect(reason).toMatch(/not started/)
    expect(reason).toMatch(/blocked/)
  })

  it('is undefined once the story is finished', () => {
    expect(incompleteStoryReason(censusFeatures([f('done')]))).toBeUndefined()
  })
})
