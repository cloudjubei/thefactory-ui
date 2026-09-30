import { describe, expect, it } from 'vitest'
import type { ProcessResumeChoice } from 'thefactory-tools/types'

import { choiceTakesNote, parkNoteCopy, parkNoteCounter, parkNoteToSend } from './processParkNote'
import {
  PARK_NOTE_COPY,
  PARK_NOTE_COUNTER_FROM,
  PARK_NOTE_MAX_LENGTH,
} from './processParkNoteConstants'

const EVERY_CHOICE: ProcessResumeChoice[] = [
  'continue',
  'retry',
  'abandon',
  'approve',
  'request-changes',
  'reject',
]

describe('choiceTakesNote', () => {
  it('asks for a note only when changes are requested', () => {
    expect(EVERY_CHOICE.filter(choiceTakesNote)).toEqual(['request-changes'])
  })

  it('lets every other choice act at once', () => {
    for (const choice of EVERY_CHOICE.filter((c) => c !== 'request-changes')) {
      expect(choiceTakesNote(choice)).toBe(false)
    }
  })
})

describe('parkNoteCopy', () => {
  it('says the review findings go to the fix either way when the gate sends work back', () => {
    const copy = parkNoteCopy(true)
    expect(copy).toBe(PARK_NOTE_COPY.sendsBack)
    expect(copy.prompt).toBe(
      'What should change? Optional — the code review’s findings are sent to the fix either way.',
    )
    expect(copy.submitLabel).toBe('Send back to be fixed')
  })

  it('asks what needs to change when the gate only ends the run', () => {
    const copy = parkNoteCopy(false)
    expect(copy).toBe(PARK_NOTE_COPY.endsRun)
    expect(copy.prompt).toBe('What needs to change?')
    expect(copy.submitLabel).toBe('Request changes')
  })
})

describe('parkNoteCounter', () => {
  it('matches the backend’s note limit', () => {
    expect(PARK_NOTE_MAX_LENGTH).toBe(2000)
    expect(PARK_NOTE_COUNTER_FROM).toBeLessThan(PARK_NOTE_MAX_LENGTH)
  })

  it('stays quiet while the note is well under the limit', () => {
    expect(parkNoteCounter('')).toBeUndefined()
    expect(parkNoteCounter('Tighten the empty state.')).toBeUndefined()
    expect(parkNoteCounter('x'.repeat(PARK_NOTE_COUNTER_FROM - 1))).toBeUndefined()
  })

  it('counts once the note nears the limit', () => {
    expect(parkNoteCounter('x'.repeat(PARK_NOTE_COUNTER_FROM))).toBe(
      `${PARK_NOTE_COUNTER_FROM} / ${PARK_NOTE_MAX_LENGTH}`,
    )
    expect(parkNoteCounter('x'.repeat(PARK_NOTE_MAX_LENGTH))).toBe(
      `${PARK_NOTE_MAX_LENGTH} / ${PARK_NOTE_MAX_LENGTH}`,
    )
  })

  it('counts what the field holds, whitespace and line breaks included', () => {
    const lines = `${'a'.repeat(900)}\n\n${' '.repeat(950)}`
    expect(parkNoteCounter(lines)).toBe(`${lines.length} / ${PARK_NOTE_MAX_LENGTH}`)
  })
})

describe('parkNoteToSend', () => {
  it('sends no note when nothing was written', () => {
    expect(parkNoteToSend('')).toBeUndefined()
    expect(parkNoteToSend('   ')).toBeUndefined()
    expect(parkNoteToSend('\n\t \n')).toBeUndefined()
  })

  it('trims the edges and keeps what is inside', () => {
    expect(parkNoteToSend('  Fix the header.  ')).toBe('Fix the header.')
    expect(parkNoteToSend('\nFirst line.\n\n  Second line.\n')).toBe(
      'First line.\n\n  Second line.',
    )
  })

  it('never sends more than the backend accepts', () => {
    expect(parkNoteToSend('y'.repeat(PARK_NOTE_MAX_LENGTH + 50))).toBe(
      'y'.repeat(PARK_NOTE_MAX_LENGTH),
    )
    expect(parkNoteToSend(`  ${'z'.repeat(PARK_NOTE_MAX_LENGTH)}  `)).toBe(
      'z'.repeat(PARK_NOTE_MAX_LENGTH),
    )
  })
})
