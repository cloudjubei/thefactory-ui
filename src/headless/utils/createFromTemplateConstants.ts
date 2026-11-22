/** WS event streamed by `POST /projects/from-template` while the job runs. */
export const TEMPLATE_FORK_PROGRESS_EVENT = 'template:fork-progress'

/**
 * How long `createFromTemplate().done` waits for a terminal `template:fork-progress`
 * event before rejecting. Without this, a missing WS or a dropped terminal event
 * leaves submit spinning forever.
 */
export const TEMPLATE_FORK_DONE_TIMEOUT_MS = 15 * 60 * 1000

export const CREATE_FROM_TEMPLATE_COPY = {
  pickTemplate: 'Pick a template',
  nameLabel: 'Name',
  nameHint:
    'A short label for this project. The id below is derived from it until you edit the id.',
  nameRequired: 'Name is required.',
  idLabel: 'Project ID',
  idHint: 'Used as the on-disk folder name. Title and description come from the template.',
  idRequired: 'Project ID is required.',
  idTaken: (id: string) => `Project id "${id}" already exists.`,
  idTakenHint: 'That id is already taken.',
  idAvailableHint: 'Available.',
  groupLabel: 'Group (optional)',
  groupNone: 'No group',
  create: 'Create',
  abort: 'Cancel',
  creating: 'Creating from template…',
  progressFallback: 'Working…',
} as const

export const TEMPLATE_DIFFICULTY_LABEL = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
} as const

export const TEMPLATE_FORK_PHASE_LABEL = {
  cloning: 'Cloning template…',
  installing: 'Installing dependencies…',
  initializing: 'Initialising project…',
  'creating-repo': 'Creating GitHub repository…',
  done: 'Done',
  error: 'Failed',
} as const
