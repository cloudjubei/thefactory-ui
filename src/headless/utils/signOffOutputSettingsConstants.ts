import type { SignOffOutputFormDraft, SignOffOutputsLayout } from './signOffOutputSettingsTypes'

export const SIGN_OFF_OUTPUT_EMPTY_DRAFT: SignOffOutputFormDraft = {
  label: '',
  templateNoteId: '',
  perRepo: false,
}

export const SIGN_OFF_OUTPUTS_LAYOUTS: readonly SignOffOutputsLayout[] = ['rows', 'folds', 'cards']

/** The layout that ships. */
export const SIGN_OFF_OUTPUTS_DEFAULT_LAYOUT: SignOffOutputsLayout = 'rows'

export const SIGN_OFF_OUTPUTS_LAYOUT_LABELS: Record<SignOffOutputsLayout, string> = {
  rows: 'Rows that open',
  folds: 'Rows that unfold',
  cards: 'Cards',
}

export const SIGN_OFF_OUTPUT_PROBLEMS = {
  label: 'Give it a name.',
  repeated: 'Another output has this name.',
  template: 'Choose a template note.',
} as const

export const SIGN_OFF_OUTPUT_COPY = {
  heading: 'Sign-off outputs',
  add: 'Add output',
  save: 'Save',
  cancel: 'Cancel',
  remove: 'Remove',
  edit: 'Edit',
  close: 'Close',
  noneYet: 'No outputs yet.',
  loading: 'Loading…',
  labelField: 'Name',
  labelHint: 'What the sign-off calls it, e.g. PR Text.',
  labelPlaceholder: 'PR Text',
  templateField: 'Template note',
  templateHint: 'The note a run writes it from.',
  templatePlaceholder: 'Choose a note',
  noNotesProject: 'No notes here yet. Add one in this project’s Notes first.',
  noNotesGroup: 'No notes here yet. Add one in this group’s Notes first.',
  perRepoField: 'One per repo',
  perRepoHint: 'On: each repo writes its own. Off: one for all the work.',
  perRepo: 'One per repo',
  oneForAll: 'One for all the work',
  deletedNote: 'A deleted note',
  templateLoading: 'Template note',
  templateGone: 'Its template note is gone, so a run gets no template.',
  noTemplate: 'No template',
  fromGroup: (title: string) => `From ${title}`,
  changeOnGroup: (title: string) =>
    `Change it in Settings → Group for ${title}. Adding one with the same name here replaces it for this project.`,
  replaces: (title: string) => `Replaces ${title}’s`,
  projectIntro: (title: string) => `Documents runs in ${title} write for their sign-off.`,
  mainGroupIntro: (title: string) =>
    `Documents runs in ${title} write for their sign-off, and in every project whose main group it is.`,
  scopeGroup: (title: string) =>
    `${title} is a scope group. Sign-off outputs are set on main groups; its projects follow their own main group.`,
  removeConfirm: (label: string) => `Runs stop writing ${label}. What they already wrote stays.`,
  saveFailed: 'Could not save the outputs. Try again.',
  notesFailed: 'Could not read the notes, so no template can be chosen. Try again.',
} as const
