import { describe, it, expect } from 'vitest'
import {
  canonicalNoteValues,
  canRevealNote,
  emptyNoteForm,
  isEmptyNotePatch,
  isNoteFormValid,
  noteAccessHelp,
  noteAccessLabel,
  noteCreateBody,
  noteFormErrors,
  noteFormValues,
  noteAuthorLabel,
  noteKindLabel,
  notePatchBody,
  projectNoteChipView,
  sortNotes,
  linkedNoteState,
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
    author: 'user',
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
      'Any agent that reaches these notes can read this whenever it needs it.',
    )
    expect(noteAccessHelp('ask')).toBe('Every read asks you first.')
  })
})

describe('projectNoteChipView', () => {
  it('shows a plain note’s text, with what it is for and who may read it', () => {
    expect(
      projectNoteChipView({
        label: 'Testing build',
        kind: 'note',
        access: 'open',
        description: 'How to build each flavour',
      }),
    ).toEqual({
      label: 'Testing build',
      kind: 'note',
      kindLabel: 'Note',
      description: 'How to build each flavour',
      accessLabel: 'Open',
      accessHelp: 'Any agent that reaches these notes can read this whenever it needs it.',
      showsValue: true,
    })
  })

  it('never shows a secret’s value — it says so instead', () => {
    const view = projectNoteChipView({ label: 'API key', kind: 'secret', access: 'ask' })
    expect(view.showsValue).toBe(false)
    expect(view.hiddenValue).toBe('A secret — its value is never shown here.')
    expect(view.accessLabel).toBe('Ask first')
  })

  it('names a note the project no longer has without inventing its details', () => {
    expect(projectNoteChipView({ label: 'note-9', kind: 'note' })).toEqual({
      label: 'note-9',
      kind: 'note',
      kindLabel: 'Note',
      showsValue: false,
    })
  })
})

describe('noteAuthorLabel', () => {
  it('marks a note an agent wrote', () => {
    expect(noteAuthorLabel(summary({ author: 'agent', kind: 'note', access: 'open' }))).toBe(
      'By an agent',
    )
  })

  it('adds nothing to a note the user wrote — that is every note but an agent’s', () => {
    expect(noteAuthorLabel(summary({ author: 'user' }))).toBeUndefined()
  })
})

describe('canonicalNoteValues', () => {
  const upper = (text: string) => text.toUpperCase()
  const form = { ...emptyNoteForm(), value: 'see #3', description: 'for #2' }

  it('rewrites a plain note’s text and description', () => {
    expect(canonicalNoteValues({ ...form, kind: 'note' }, upper)).toMatchObject({
      value: 'SEE #3',
      description: 'FOR #2',
    })
  })

  it('hands the edited note’s old description along, so only what is new is turned', () => {
    const seen: Array<string | undefined> = []
    canonicalNoteValues(
      { ...form, kind: 'note' },
      (text, before) => {
        seen.push(before)
        return text
      },
      { description: 'was #2' },
    )
    expect(seen).toEqual([undefined, 'was #2'])
  })

  it('never touches a secret’s value', () => {
    expect(canonicalNoteValues({ ...form, kind: 'secret' }, upper)).toMatchObject({
      value: 'see #3',
      description: 'FOR #2',
    })
  })
})

describe('noteFormValues with references', () => {
  it('shows the stored description as a person edits it', () => {
    const note = {
      id: 'n',
      projectId: 'p',
      label: 'L',
      kind: 'note',
      access: 'ask',
      description: 'see #ID',
    } as unknown as ProjectNoteSummary
    expect(noteFormValues(note, (t) => t.replace('#ID', '#3')).description).toBe('see #3')
  })
})

describe('linkedNoteState', () => {
  const notes = [{ id: 'n1' }, { id: 'n2' }]

  it('is none when the screen was opened without a note', () => {
    expect(linkedNoteState(notes, undefined, true)).toBe('none')
    expect(linkedNoteState(notes, null, false)).toBe('none')
    expect(linkedNoteState(notes, '', true)).toBe('none')
  })

  it('waits for the notes to load before deciding', () => {
    expect(linkedNoteState([], 'n1', false)).toBe('loading')
  })

  it('finds the note the link names, or says it is gone', () => {
    expect(linkedNoteState(notes, 'n2', true)).toBe('found')
    expect(linkedNoteState(notes, 'n9', true)).toBe('missing')
    expect(linkedNoteState([], 'n1', true)).toBe('missing')
  })
})
