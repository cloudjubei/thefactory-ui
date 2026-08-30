import { describe, it, expect } from 'vitest'
import {
  canRevealNote,
  emptyNoteForm,
  isEmptyNotePatch,
  isNoteFormValid,
  noteAccessHelp,
  noteAccessLabel,
  noteCreateBody,
  noteFormErrors,
  noteFormValues,
  noteKindLabel,
  notePatchBody,
  sortNotes,
} from './projectNotes'
import { NOTE_LABEL_REQUIRED, NOTE_VALUE_REQUIRED } from './projectNotesConstants'
import type { ProjectNoteSummary } from '../api'
import type { ProjectNoteFormValues } from './projectNotesTypes'

function summary(overrides: Partial<ProjectNoteSummary> = {}): ProjectNoteSummary {
  return {
    id: 'n1',
    projectId: 'p1',
    label: 'Staging login',
    kind: 'secret',
    description: 'Account for the app under test',
    access: 'ask',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  }
}

function form(overrides: Partial<ProjectNoteFormValues> = {}): ProjectNoteFormValues {
  return {
    label: 'Staging login',
    kind: 'secret',
    value: '',
    description: 'Account for the app under test',
    access: 'ask',
    ...overrides,
  }
}

describe('emptyNoteForm', () => {
  it('starts blank as a note with the ask-first access mode', () => {
    expect(emptyNoteForm()).toEqual({
      label: '',
      kind: 'note',
      value: '',
      description: '',
      access: 'ask',
    })
  })

  it('returns a fresh object each call', () => {
    const first = emptyNoteForm()
    first.label = 'edited'
    expect(emptyNoteForm().label).toBe('')
  })
})

describe('noteFormValues', () => {
  it('seeds an edit form from the summary and leaves the value empty', () => {
    expect(noteFormValues(summary())).toEqual({
      label: 'Staging login',
      kind: 'secret',
      value: '',
      description: 'Account for the app under test',
      access: 'ask',
    })
  })

  it('renders a missing description as an empty string', () => {
    expect(noteFormValues(summary({ description: undefined })).description).toBe('')
  })
})

describe('noteFormErrors', () => {
  it('requires a label in both modes', () => {
    expect(noteFormErrors(form({ label: '  ', value: 'v' }), 'create').label).toBe(
      NOTE_LABEL_REQUIRED,
    )
    expect(noteFormErrors(form({ label: '' }), 'edit').label).toBe(NOTE_LABEL_REQUIRED)
  })

  it('requires a value only when creating', () => {
    expect(noteFormErrors(form({ value: '   ' }), 'create').value).toBe(NOTE_VALUE_REQUIRED)
    expect(noteFormErrors(form({ value: '' }), 'edit').value).toBeUndefined()
  })

  it('reports no errors for a complete form', () => {
    expect(noteFormErrors(form({ value: 'hunter2' }), 'create')).toEqual({})
    expect(noteFormErrors(form(), 'edit')).toEqual({})
  })
})

describe('isNoteFormValid', () => {
  it('is true only when there are no field errors', () => {
    expect(isNoteFormValid(form({ value: 'hunter2' }), 'create')).toBe(true)
    expect(isNoteFormValid(form({ value: '' }), 'create')).toBe(false)
    expect(isNoteFormValid(form({ value: '' }), 'edit')).toBe(true)
    expect(isNoteFormValid(form({ label: ' ', value: 'v' }), 'edit')).toBe(false)
  })
})

describe('noteCreateBody', () => {
  it('trims the label, value and description', () => {
    expect(
      noteCreateBody(
        form({ label: '  Api key  ', value: '  abc  ', description: '  why  ', kind: 'secret' }),
      ),
    ).toEqual({
      label: 'Api key',
      kind: 'secret',
      value: 'abc',
      description: 'why',
      access: 'ask',
    })
  })

  it('omits a blank description rather than sending an empty string', () => {
    const body = noteCreateBody(form({ value: 'abc', description: '   ' }))
    expect('description' in body).toBe(false)
    expect(body).toEqual({ label: 'Staging login', kind: 'secret', value: 'abc', access: 'ask' })
  })

  it('carries the chosen kind and access through', () => {
    expect(noteCreateBody(form({ value: 'v', kind: 'note', access: 'open' }))).toMatchObject({
      kind: 'note',
      access: 'open',
    })
  })
})

describe('notePatchBody', () => {
  it('is empty when nothing changed', () => {
    expect(notePatchBody(form(), summary())).toEqual({})
  })

  it('includes only the changed fields', () => {
    expect(notePatchBody(form({ label: '  Renamed  ' }), summary())).toEqual({ label: 'Renamed' })
    expect(notePatchBody(form({ kind: 'note' }), summary())).toEqual({ kind: 'note' })
    expect(notePatchBody(form({ access: 'open' }), summary())).toEqual({ access: 'open' })
  })

  it('omits the value when left empty, and trims it when supplied', () => {
    expect('value' in notePatchBody(form({ value: '   ' }), summary())).toBe(false)
    expect(notePatchBody(form({ value: '  next  ' }), summary())).toEqual({ value: 'next' })
  })

  it('sends an emptied description so it can be cleared', () => {
    expect(notePatchBody(form({ description: '  ' }), summary())).toEqual({ description: '' })
  })

  it('does not send a description that only differs by surrounding whitespace', () => {
    expect(
      notePatchBody(form({ description: '  Account for the app under test  ' }), summary()),
    ).toEqual({})
  })

  it('treats a missing stored description as empty', () => {
    expect(notePatchBody(form({ description: '' }), summary({ description: undefined }))).toEqual(
      {},
    )
  })
})

describe('isEmptyNotePatch', () => {
  it('detects a no-op patch', () => {
    expect(isEmptyNotePatch({})).toBe(true)
    expect(isEmptyNotePatch({ label: 'x' })).toBe(false)
  })
})

describe('sortNotes', () => {
  it('orders by label case-insensitively, breaking ties on id', () => {
    const notes = [
      summary({ id: 'b', label: 'zeta' }),
      summary({ id: 'a', label: 'Alpha' }),
      summary({ id: 'd', label: 'beta' }),
      summary({ id: 'c', label: 'beta' }),
    ]
    expect(sortNotes(notes).map((n) => n.id)).toEqual(['a', 'c', 'd', 'b'])
  })

  it('does not mutate the input array', () => {
    const notes = [summary({ id: 'b', label: 'zeta' }), summary({ id: 'a', label: 'alpha' })]
    sortNotes(notes)
    expect(notes.map((n) => n.id)).toEqual(['b', 'a'])
  })
})

describe('canRevealNote', () => {
  it('applies to secrets only', () => {
    expect(canRevealNote(summary({ kind: 'secret' }))).toBe(true)
    expect(canRevealNote(summary({ kind: 'note' }))).toBe(false)
  })
})

describe('label helpers', () => {
  it('names each kind and access mode', () => {
    expect(noteKindLabel('note')).toBe('Note')
    expect(noteKindLabel('secret')).toBe('Secret')
    expect(noteAccessLabel('open')).toBe('Open')
    expect(noteAccessLabel('ask')).toBe('Ask first')
  })

  it('explains each access mode honestly', () => {
    expect(noteAccessHelp('open')).toBe(
      'Any agent working on this project can read this whenever it needs it.',
    )
    expect(noteAccessHelp('ask')).toBe('Every read asks you first.')
  })
})
