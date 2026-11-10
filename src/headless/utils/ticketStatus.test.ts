import { describe, expect, it } from 'vitest'
import { ticketStatusLozenge, ticketStatusTone } from './ticketStatus'

describe('ticketStatusTone', () => {
  it.each([
    ['new', 'todo'],
    ['indeterminate', 'progress'],
    ['done', 'done'],
    ['DONE', 'done'],
    [' Indeterminate ', 'progress'],
    ['undefined', 'unknown'],
    ['in-flight', 'unknown'],
    ['', 'unknown'],
    [undefined, 'unknown'],
  ] as const)('reads %s as %s', (category, tone) => {
    expect(ticketStatusTone(category)).toBe(tone)
  })
})

describe('ticketStatusLozenge', () => {
  it('names the status in its category tone', () => {
    expect(ticketStatusLozenge('In Review', 'indeterminate')).toEqual({
      label: 'In Review',
      tone: 'progress',
    })
  })

  it('shows a status with no category in the unknown tone', () => {
    expect(ticketStatusLozenge('Triage')).toEqual({ label: 'Triage', tone: 'unknown' })
  })

  it.each([[undefined], [''], ['   ']])('has nothing to show for no status (%j)', (status) => {
    expect(ticketStatusLozenge(status, 'done')).toBeUndefined()
  })
})
