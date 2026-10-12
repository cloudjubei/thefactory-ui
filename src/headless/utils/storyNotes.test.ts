import { describe, expect, it } from 'vitest'
import { STORY_NOTE_MAX_VALUE_CHARS } from 'thefactory-tools/constants'
import type { Feature, Story, StoryNote } from 'thefactory-tools/types'
import {
  storyNoteAuthorLabel,
  storyNoteFormError,
  storyNoteFormValues,
  storyNotePatch,
  storyNotesOf,
} from './storyNotes'
import {
  STORY_NOTE_AUTHOR_LABELS,
  STORY_NOTE_LABEL_REQUIRED,
  STORY_NOTE_VALUE_REQUIRED,
} from './storyNotesConstants'

const note = (id: string, over: Partial<StoryNote> = {}): StoryNote => ({
  id,
  label: `L ${id}`,
  value: `V ${id}`,
  author: 'agent',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...over,
})

const feature = (id: string, notes?: StoryNote[]): Feature =>
  ({
    id,
    title: id,
    status: 'pending',
    description: '',
    context: [],
    ...(notes ? { notes } : {}),
  }) as unknown as Feature

const story = (over: Partial<Story> = {}): Story =>
  ({ id: 's1', title: 'S', description: '', status: 'pending', features: [], ...over }) as Story

describe('storyNotesOf', () => {
  it('answers the story’s own notes', () => {
    expect(storyNotesOf(story({ notes: [note('a')] })).map((n) => n.id)).toEqual(['a'])
  })

  it('answers one feature’s notes when it is named', () => {
    const s = story({ notes: [note('a')], features: [feature('f1', [note('b')])] })
    expect(storyNotesOf(s, 'f1').map((n) => n.id)).toEqual(['b'])
  })

  it('answers no notes for a feature the story does not have', () => {
    expect(storyNotesOf(story(), 'missing')).toEqual([])
  })

  it('answers no notes for an absent story', () => {
    expect(storyNotesOf(undefined)).toEqual([])
  })
})

describe('storyNoteAuthorLabel', () => {
  it('says who wrote it', () => {
    expect(storyNoteAuthorLabel(note('a', { author: 'user' }))).toBe(STORY_NOTE_AUTHOR_LABELS.user)
    expect(storyNoteAuthorLabel(note('a'))).toBe(STORY_NOTE_AUTHOR_LABELS.agent)
  })
})

describe('storyNoteFormError', () => {
  it('accepts a label and a note', () => {
    expect(storyNoteFormError({ label: 'L', value: 'V' })).toBeUndefined()
  })

  it('asks for a label', () => {
    expect(storyNoteFormError({ label: '  ', value: 'V' })).toBe(STORY_NOTE_LABEL_REQUIRED)
  })

  it('asks for the note', () => {
    expect(storyNoteFormError({ label: 'L', value: '' })).toBe(STORY_NOTE_VALUE_REQUIRED)
  })

  it('refuses a note over the store’s limit', () => {
    const value = 'x'.repeat(STORY_NOTE_MAX_VALUE_CHARS + 1)
    expect(storyNoteFormError({ label: 'L', value })).toMatch(/under/)
  })
})

describe('storyNoteFormValues', () => {
  it('fills the form from a note', () => {
    expect(storyNoteFormValues(note('a'))).toEqual({ label: 'L a', value: 'V a' })
  })

  it('starts empty without one', () => {
    expect(storyNoteFormValues(undefined)).toEqual({ label: '', value: '' })
  })
})

describe('storyNotePatch', () => {
  it('sends only what changed, the label trimmed', () => {
    expect(storyNotePatch(note('a'), { label: ' New ', value: 'V a' })).toEqual({ label: 'New' })
  })

  it('sends nothing when nothing changed', () => {
    expect(storyNotePatch(note('a'), { label: 'L a', value: 'V a' })).toEqual({})
  })
})
