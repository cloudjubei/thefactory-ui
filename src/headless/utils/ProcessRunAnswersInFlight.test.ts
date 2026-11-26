import { describe, expect, it, vi } from 'vitest'

import { ProcessRunAnswersInFlight } from './ProcessRunAnswersInFlight'

describe('ProcessRunAnswersInFlight', () => {
  it('takes the first answer for a run and refuses any other until it ends', () => {
    const answers = new ProcessRunAnswersInFlight()
    const first = { choice: 'update-base', parkedAt: 5 } as const
    expect(answers.begin('r1', first)).toBe(true)
    expect(answers.begin('r1', first)).toBe(false)
    expect(answers.begin('r1', { choice: 'abandon', parkedAt: 5 })).toBe(false)
    expect(answers.get('r1')).toBe(first)
    answers.end('r1')
    expect(answers.get('r1')).toBeUndefined()
    expect(answers.begin('r1', { choice: 'retry', parkedAt: 6 })).toBe(true)
  })

  it('keeps each run’s answer apart', () => {
    const answers = new ProcessRunAnswersInFlight()
    expect(answers.begin('r1', { choice: 'retry' })).toBe(true)
    expect(answers.begin('r2', { choice: 'retry' })).toBe(true)
    answers.end('r1')
    expect(answers.get('r1')).toBeUndefined()
    expect(answers.get('r2')).toEqual({ choice: 'retry' })
  })

  it('tells its listeners when an answer starts and ends, never for a refused one', () => {
    const answers = new ProcessRunAnswersInFlight()
    const heard = vi.fn()
    const off = answers.subscribe(heard)
    answers.begin('r1', { choice: 'retry' })
    answers.begin('r1', { choice: 'retry' })
    expect(heard).toHaveBeenCalledTimes(1)
    answers.end('r1')
    answers.end('r1')
    expect(heard).toHaveBeenCalledTimes(2)
    off()
    answers.begin('r1', { choice: 'retry' })
    expect(heard).toHaveBeenCalledTimes(2)
  })
})
