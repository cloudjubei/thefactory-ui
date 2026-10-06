import { describe, expect, it } from 'vitest'
import type { ProcessParkAction } from 'thefactory-tools/types'

import {
  choiceTakesNote,
  parkNoteCounter,
  parkNoteRequired,
  parkNoteToSend,
  requestChangesProofPreset,
  toggleRequestedProof,
  uiChangeScopeOf,
  waitingNoteCopy,
} from './processParkNote'
import {
  PARK_NOTE_COPY,
  PARK_NOTE_COUNTER_FROM,
  PARK_NOTE_MAX_LENGTH,
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
  'delegate',
]

describe('choiceTakesNote', () => {
  it('asks for a note when changes are requested, and when a waiting agent is told more', () => {
    expect(EVERY_CHOICE.filter(choiceTakesNote)).toEqual(['request-changes', 'more-info'])
  })

  it('lets every other choice act at once', () => {
    for (const choice of EVERY_CHOICE.filter((c) => c !== 'request-changes' && c !== 'more-info')) {
      expect(choiceTakesNote(choice)).toBe(false)
    }
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

describe('requestChangesProofPreset', () => {
  const feature = (over: object = {}) => ({
    title: 'Parse ISO dates',
    description: 'Accept ISO 8601 in the importer.',
    ...over,
  })

  it('starts out requiring on-screen proof for a story whose change is to what users see', () => {
    expect(
      requestChangesProofPreset({
        features: [feature(), feature({ title: 'North Star progress on the Overview dashboard' })],
      }),
    ).toEqual(['ui-before-after'])
  })

  it('reads a feature’s files against the project’s app folder', () => {
    expect(
      requestChangesProofPreset({
        features: [feature({ files: ['viewer/app.js'] })],
        scope: { appDir: 'viewer' },
      }),
    ).toEqual(['ui-before-after'])
  })

  it('starts out requiring it when a plan already asks for screens', () => {
    expect(
      requestChangesProofPreset({ features: [feature()], plannedKinds: ['ui-before-after'] }),
    ).toEqual(['ui-before-after'])
  })

  it('requires nothing for a change nobody sees', () => {
    expect(
      requestChangesProofPreset({ features: [feature({ files: ['src/importer.ts'] })] }),
    ).toEqual([])
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

describe('uiChangeScopeOf', () => {
  it('reads the project’s app folder, trimmed', () => {
    expect(uiChangeScopeOf({ appDir: ' viewer ' })).toEqual({ appDir: 'viewer' })
  })

  it.each([undefined, {}, { appDir: '  ' }, { appDir: 3 }])('is no folder for %j', (metadata) => {
    expect(uiChangeScopeOf(metadata)).toEqual({})
  })
})
