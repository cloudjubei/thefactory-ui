export const APP_WORK_START_HEADING = 'Start work?'

export const APP_WORK_START_HINT = 'The app asks to start work in this project.'

export const APP_WORK_START_ONE_FEATURE = 'Runs as one feature.'

export const APP_WORK_START_LABELS = {
  title: 'Title',
  description: 'Description',
  features: 'Features',
  featureTitle: 'Feature title',
  featureDescription: 'Feature description',
  start: 'Start',
  cancel: 'Cancel',
} as const

export const APP_WORK_START_TITLE_REQUIRED = 'The work needs a title.'

export const APP_WORK_START_FEATURE_TITLE_REQUIRED = 'Each feature needs a title.'

export const APP_WORK_START_PROCESS_INVALID =
  'processId must be a process id: letters, digits, dots, dashes or underscores.'

export const APP_WORK_START_FEATURES_INVALID = 'features must be a list of { title, description }.'

export const APP_WORK_START_FAILED = 'The work did not start.'

export const APP_WORK_START_CLOSED = 'The app was closed before an answer.'

export const APP_WORK_START_NO_PROJECT = 'No active project to start work in.'

export const APP_WORK_START_FEATURE_MISSING = 'A feature was made but could not be found.'
