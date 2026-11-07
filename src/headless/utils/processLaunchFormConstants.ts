/** Every word of the form a process launches from. */
export const PROCESS_LAUNCH_COPY = {
  ask: 'Start a run',
  verb: 'Start run',
  addVariant: 'Add a variant',
  variantLabel: 'Label',
  variantLabelHint: 'What this variant is called',
  unnamedVariant: (at: number): string => `Variant ${at}`,
  removeVariant: (at: number): string => `Remove variant ${at}`,
  removeThisVariant: 'Remove this variant',
  refPlaceholder: 'A commit or branch',
  ref: 'Ref',
  refOf: (repo: string): string => `${repo} ref`,
  oneRef: 'Use one ref',
  splitRefs: (repos: readonly string[]): string =>
    `Use ${repos.map((repo) => `a ${repo}`).join(' and ')} ref`,
  patch: 'Patch',
  patchOf: (repo: string): string => `${repo} patch`,
  patchNone: 'None',
  patchWritten: 'A patch',
  optional: 'optional',
  chooseNote: 'Choose a note',
  noNotes: 'This project has no notes yet.',
  loading: 'Reading the form…',
  notSet: 'Not set',
} as const

/** How long a form rests before it is checked again. */
export const PROCESS_LAUNCH_PREVIEW_DEBOUNCE_MS = 350

/** A ref shown on a chip: a full commit by its first characters. */
export const PROCESS_LAUNCH_SHORT_REF = 7

/** The kinds drawn side by side in one row. */
export const PROCESS_LAUNCH_SHORT_KINDS: readonly string[] = ['note-reference', 'number']
