export const APP_FEATURE_REQUEST_HEADING = 'Send a feature request?'

export const APP_FEATURE_REQUEST_HINT =
  'The app asks to send this request. Nothing changes in that project until the request is accepted there.'

export const APP_FEATURE_REQUEST_LABELS = {
  to: 'To',
  title: 'Title',
  summary: 'Summary',
  description: 'Description',
  doneWhen: 'Done when',
  doneWhenHint: 'One line each.',
  references: 'References',
  send: 'Send',
  cancel: 'Cancel',
} as const

export const APP_FEATURE_REQUEST_TARGET_REQUIRED = 'A request needs the project it goes to.'

export const APP_FEATURE_REQUEST_TITLE_REQUIRED = 'A request needs a title.'

export const APP_FEATURE_REQUEST_LISTS_INVALID = 'doneWhen and references must be lists of text.'

export const APP_FEATURE_REQUEST_OWN_PROJECT =
  'A request goes to another project. Add work for this one as a story.'

export const APP_FEATURE_REQUEST_FAILED = 'The request was not sent.'

export const APP_FEATURE_REQUEST_CLOSED = 'The app was closed before an answer.'

export const APP_FEATURE_REQUEST_NO_PROJECT = 'No active project to send the request from.'
