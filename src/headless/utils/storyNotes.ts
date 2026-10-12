// Pure logic for the notes kept with a story or a feature: which notes a view
// shows, who wrote them, and the form's checks and bodies. No React, no I/O.

import { STORY_NOTE_MAX_VALUE_CHARS } from 'thefactory-tools/constants'
import type { Story, StoryNote, StoryNoteUpdateInput } from 'thefactory-tools/types'
import {
  EMPTY_STORY_NOTE_FORM,
  STORY_NOTE_AUTHOR_LABELS,
  STORY_NOTE_LABEL_REQUIRED,
  STORY_NOTE_VALUE_REQUIRED,
  STORY_NOTE_VALUE_TOO_LONG,
} from './storyNotesConstants'
import type { StoryNoteFormValues } from './storyNotesTypes'

/** The notes kept with the story, or with one of its features when it is named. */
export function storyNotesOf(story: Story | undefined, featureId?: string): StoryNote[] {
  if (!story) return []
  if (featureId === undefined) return story.notes ?? []
  return story.features.find((f) => f.id === featureId)?.notes ?? []
}

/** Who wrote a note, as its row says it. */
export function storyNoteAuthorLabel(note: Pick<StoryNote, 'author'>): string {
  return STORY_NOTE_AUTHOR_LABELS[note.author]
}

/** What is wrong with the form, or `undefined` when it can be saved. */
export function storyNoteFormError(values: StoryNoteFormValues): string | undefined {
  if (values.label.trim().length === 0) return STORY_NOTE_LABEL_REQUIRED
  if (values.value.length === 0) return STORY_NOTE_VALUE_REQUIRED
  if (values.value.length > STORY_NOTE_MAX_VALUE_CHARS) {
    return STORY_NOTE_VALUE_TOO_LONG(STORY_NOTE_MAX_VALUE_CHARS)
  }
  return undefined
}

/** The form's starting values: a note being edited, or an empty one. */
export function storyNoteFormValues(note: StoryNote | undefined): StoryNoteFormValues {
  return note ? { label: note.label, value: note.value } : { ...EMPTY_STORY_NOTE_FORM }
}

/** The change an edit makes to a note: only the fields that differ, the label trimmed. */
export function storyNotePatch(note: StoryNote, values: StoryNoteFormValues): StoryNoteUpdateInput {
  const label = values.label.trim()
  return {
    ...(label !== note.label ? { label } : {}),
    ...(values.value !== note.value ? { value: values.value } : {}),
  }
}
