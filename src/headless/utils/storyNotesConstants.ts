import type { StoryNoteFormValues } from './storyNotesTypes'

/** The words of the story and feature notes section, shared by web and native. */
export const STORY_NOTES_COPY = {
  title: 'Notes',
  storyHint: 'Extra information for the agents and people working on this story — kept with it.',
  featureHint:
    'Extra information for the agents and people working on this feature — kept with it.',
  empty: 'No notes yet.',
  add: 'Add note',
  newTitle: 'New note',
  editTitle: (label: string) => `Edit: ${label}`,
  deleteTitle: 'Delete note',
  deleteDescription: (label: string) =>
    `This removes "${label}". Agents working on this story will no longer see it.`,
  deleteConfirm: 'Delete',
  labelField: 'Label',
  labelPlaceholder: 'e.g. Why the cache stays',
  valueField: 'Note',
  valuePlaceholder: 'What the next person or agent should know about this work',
  save: 'Save',
  edit: 'Edit',
  remove: 'Delete',
  updated: 'Updated',
} as const

/** Marks who wrote a note. */
export const STORY_NOTE_AUTHOR_LABELS = {
  user: 'By you',
  agent: 'By an agent',
} as const

export const STORY_NOTE_LABEL_REQUIRED = 'Give the note a label.'
export const STORY_NOTE_VALUE_REQUIRED = 'Write the note.'
export const STORY_NOTE_VALUE_TOO_LONG = (limit: number) =>
  `Keep the note under ${limit.toLocaleString('en')} characters — put longer content in a file.`

export const EMPTY_STORY_NOTE_FORM: StoryNoteFormValues = { label: '', value: '' }
