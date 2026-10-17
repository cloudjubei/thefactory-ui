import { describe, expect, it } from 'vitest'
import type { ProcessParkAction } from 'thefactory-tools/types'

import {
  choiceTakesNote,
  parkNoteCopy,
  parkNoteCounter,
  parkNoteRequired,
  parkNoteToSend,
  requestProofChoices,
  toggleRequestedProof,
  waitingNoteCopy,
} from './processParkNote'
import {
  PARK_NOTE_COPY,
  PARK_NOTE_COUNTER_FROM,
  PARK_NOTE_MAX_LENGTH,
  REQUEST_PROOF_CHOICES,
  SEND_TO_DEVELOPER_NOTE_COPY,
} from './processParkNoteConstants'

const EVERY_CHOICE: ProcessParkAction[] = [
  'continue',
  'retry',
  'abandon',
  'approve',
  'request-changes',
  'reject',
  'allow',
  'resolved',
  'more-info',
  'send-to-developer',
  'delegate',
]
const NOTED: ProcessParkAction[] = ['request-changes', 'more-info', 'send-to-developer']

describe('choiceTakesNote', () => {
  it('asks for a note when changes are requested, a waiting agent is told more, or work goes back to the developer', () => {
    expect(EVERY_CHOICE.filter(choiceTakesNote)).toEqual(NOTED)
  })

  it('lets every other choice act at once', () => {
    for (const choice of EVERY_CHOICE.filter((c) => !NOTED.includes(c))) {
      expect(choiceTakesNote(choice)).toBe(false)
    }
  })
})

describe('parkNoteCopy', () => {
  it('asks what the developer should do when the checks send work back to it', () => {
    expect(parkNoteCopy('send-to-developer')).toBe(SEND_TO_DEVELOPER_NOTE_COPY)
    expect(SEND_TO_DEVELOPER_NOTE_COPY).toEqual({
      prompt: 'What should the developer do? Optional — the checks’ findings go with it.',
      submitLabel: 'Send back',
    })
  })

  it('keeps the gate’s words for a request for changes', () => {
    expect(parkNoteCopy('request-changes')).toBe(PARK_NOTE_COPY)
  })
})

describe('parkNoteRequired', () => {
  it('will not send "more info" or an answer blank — the words are the answer', () => {
    expect(EVERY_CHOICE.filter(parkNoteRequired)).toEqual(['more-info'])
  })
})

describe('waitingNoteCopy', () => {
  it('asks for an answer to a question', () => {
    expect(waitingNoteCopy('question')).toEqual({
      prompt: 'Your answer',
      submitLabel: 'Send answer',
    })
  })

  it('asks what the agent should know otherwise', () => {
    for (const kind of ['permission', 'blocker'] as const) {
      expect(waitingNoteCopy(kind)).toEqual({
        prompt: 'What should the agent know?',
        submitLabel: 'Send and continue',
      })
    }
  })
})

describe('PARK_NOTE_COPY', () => {
  it('says the work is sent back to be fixed and comes back here', () => {
    expect(PARK_NOTE_COPY.submitLabel).toBe('Send back to be fixed')
    expect(PARK_NOTE_COPY.prompt).toMatch(/comes back here/)
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

describe('toggleRequestedProof', () => {
  it('switches a kind on, in canonical order, once', () => {
    expect(toggleRequestedProof(['live-backend'], 'unit-tests', true)).toEqual([
      'unit-tests',
      'live-backend',
    ])
    expect(toggleRequestedProof(['unit-tests'], 'unit-tests', true)).toEqual(['unit-tests'])
  })

  it('switches a kind off', () => {
    expect(toggleRequestedProof(['unit-tests', 'ui-before-after'], 'unit-tests', false)).toEqual([
      'ui-before-after',
    ])
  })
})

describe('requestProofChoices', () => {
  it('offers every kind a request can require, each pickable, when the run can produce them all', () => {
    expect(requestProofChoices()).toEqual(REQUEST_PROOF_CHOICES)
  })

  it('holds off a kind the run cannot produce, saying why', () => {
    const choices = requestProofChoices([
      { kind: 'ui-before-after', reason: 'No runnable browser app.' },
      { kind: 'manual', reason: 'not offered here' },
    ])
    expect(choices.map((c) => [c.kind, c.unavailable])).toEqual([
      ['ui-before-after', 'No runnable browser app.'],
      ['unit-tests', undefined],
      ['live-backend', undefined],
    ])
  })
})
