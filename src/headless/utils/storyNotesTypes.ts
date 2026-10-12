/** What the story or feature note form holds while a person writes it. */
export type StoryNoteFormValues = {
  label: string
  value: string
}

/** Where a note list is attached: the story itself, or one of its features. */
export type StoryNotesTarget = {
  storyId: string
  featureId?: string
}
