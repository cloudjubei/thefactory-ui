import type {
  GroupSignOffLayout,
  GroupSignOffSubmittedLayout,
  SignOffOutputLayout,
} from './groupSignOffTypes'

/** Where a leg's run keeps how its group run builds. */
export const GROUP_BUILD_MODE_INPUT_KEY = 'groupBuildMode'

/** The event every fill and edit of a group run's sign-off rides on. */
export const GROUP_SIGN_OFF_EVENT = 'process:group-run-update'

/** What a person may put in an output at most, as the route takes it. */
export const SIGN_OFF_OUTPUT_MAX_CHARS = 200_000

export const GROUP_SIGN_OFF_LAYOUTS: readonly GroupSignOffLayout[] = [
  'decision-first',
  'repo-folds',
  'side-by-side',
]
export const GROUP_SIGN_OFF_DEFAULT_LAYOUT: GroupSignOffLayout = 'decision-first'
export const GROUP_SIGN_OFF_LAYOUT_LABELS: Record<GroupSignOffLayout, string> = {
  'decision-first': 'One repo at a time',
  'repo-folds': 'Repo folds',
  'side-by-side': 'Side by side',
}

export const SIGN_OFF_OUTPUT_LAYOUTS: readonly SignOffOutputLayout[] = [
  'stacked',
  'repo-switch',
  'columns',
]
export const SIGN_OFF_OUTPUT_DEFAULT_LAYOUT: SignOffOutputLayout = 'stacked'
export const SIGN_OFF_OUTPUT_LAYOUT_LABELS: Record<SignOffOutputLayout, string> = {
  stacked: 'Stacked',
  'repo-switch': 'One repo at a time',
  columns: 'Columns',
}

export const GROUP_SIGN_OFF_SUBMITTED_LAYOUTS: readonly GroupSignOffSubmittedLayout[] = [
  'steps',
  'post-first',
  'columns',
]
export const GROUP_SIGN_OFF_SUBMITTED_DEFAULT_LAYOUT: GroupSignOffSubmittedLayout = 'steps'
export const GROUP_SIGN_OFF_SUBMITTED_LAYOUT_LABELS: Record<GroupSignOffSubmittedLayout, string> = {
  steps: 'In order',
  'post-first': 'Post first',
  columns: 'Columns',
}

const plural = (count: number, one: string, many = `${one}s`): string =>
  `${count} ${count === 1 ? one : many}`

export const GROUP_SIGN_OFF_TEXT = {
  badge: 'Sign off',
  submittedBadge: 'Submitted',
  submittingBadge: 'Opening',
  failedBadge: 'Needs a retry',
  building: 'Building',
  ended: 'Ended',
  decidingLine: 'Every repo is finished. One decision covers them all.',
  buildingLine: (finished: number, total: number) =>
    `${finished} of ${total} repos finished. The sign-off opens once they all are.`,
  endedLine: 'This work ended without a sign-off.',
  plan: (open: number) =>
    open === 0
      ? 'Approving opens no pull request: no repo has real changes.'
      : `Approving opens ${plural(open, 'pull request')}.`,
  submittedLine: (opened: number, total: number) =>
    total === 0
      ? 'No repo needed a pull request.'
      : `${opened} of ${plural(total, 'pull request')} open.`,
  goingLive: 'Going live',
  repos: 'Repos',
  evidence: 'Evidence',
  noRun: 'This repo has no run to show.',
  openRun: 'Open its run',
  pullRequests: 'Pull requests',
  retry: 'Try again',
  retryLine: 'What opened stays open. This tries the rest.',
  post: 'Post',
  attach: 'What to attach',
  attachNone: 'Nothing to attach.',
  download: 'Download',
  opening: 'Fetching…',
  openLink: 'Open',
  downloadFailed: 'The file could not be fetched.',
  noSaver: 'This app cannot save files here.',
  record: 'Still to record',
  loomLeft: (left: number) => `${plural(left, 'recording')} still to make.`,
  whichRepo: 'Which repo needs changes?',
  whichRepoLabel: 'Repo to send back',
  unsaved: (labels: string) => `Save or cancel your edit to ${labels} first.`,
  readFailed: 'The sign-off could not be read.',
  decideFailed: 'The decision did not go through.',
  retryFailed: 'The pull requests could not be tried again.',
  loading: 'Reading the sign-off…',
  held: 'Decided once for all repos, at the group sign-off',
  heldBadge: 'Group sign-off',
  heldLine: 'Waits for the group sign-off',
  finished: 'Finished',
  openGroup: 'Open the group sign-off',
} as const

export const GROUP_SIGN_OFF_CHOICE_TEXT = {
  approve: 'Approve',
  approveDoes: (open: number) =>
    open === 0
      ? 'Signs off every repo. No pull request opens.'
      : `Opens ${plural(open, 'pull request')}, fills the links into the outputs and shows what to attach.`,
  requestChanges: 'Request changes',
  requestChangesDoes: 'Sends one repo back with a note. The repos that build on it follow.',
  reject: 'Reject',
  rejectDoes: 'Ends the work in every repo.',
  rejectConfirm: 'Reject the work in every repo? No pull request opens.',
  rejectConfirmLabel: 'Reject all of it',
} as const

export const GROUP_SIGN_OFF_PR_BADGE = {
  waiting: { label: 'Not finished', tone: 'queued' },
  unread: { label: 'Could not read', tone: 'stuck' },
  'to-open': { label: 'Gets a pull request', tone: 'review' },
  'left-out': { label: 'No pull request', tone: 'empty' },
  opening: { label: 'Opening', tone: 'working' },
  opened: { label: 'Opened', tone: 'done' },
  failed: { label: 'Failed', tone: 'stuck' },
  'by-hand': { label: 'Open by hand', tone: 'review' },
  merged: { label: 'Merged', tone: 'done' },
} as const

export const GROUP_SIGN_OFF_PR_TEXT = {
  waiting: 'Still working.',
  unread: 'Its change could not be read, so approving stops here.',
  openPullRequest: 'Open the pull request',
  byHandLine: 'This host cannot open one for us. Open it from here.',
  byHandLink: 'Open it on the host',
  mergedLine: 'Its work went in without a pull request.',
  files: (files: number, generated: number) =>
    generated > 0
      ? `${plural(files, 'file')}, ${generated} generated left out`
      : plural(files, 'file'),
} as const

export const GROUP_SIGN_OFF_ATTACHMENT_KINDS = {
  screenshot: 'Screenshot',
  recording: 'Recording',
  file: 'File',
  link: 'Link',
} as const

export const SIGN_OFF_OUTPUT_TEXT = {
  edit: 'Edit',
  save: 'Save',
  cancel: 'Cancel',
  copy: 'Copy',
  discard: 'Discard my edit',
  keep: 'Save mine over it',
  useNew: 'Use the new text',
  newText: 'The new text',
  notWritten: 'Not written yet.',
  loading: 'Reading…',
  readFailed: 'This could not be read.',
  saveFailed: 'The edit could not be saved.',
  changedNotice: 'This changed while you were editing. Your text is kept here, not saved yet.',
  closedNotice: 'The sign-off is decided, so this edit was not saved. Your text is kept here.',
  empty: 'Write something first.',
  tooLong: (max: number) => `Keep it under ${max.toLocaleString('en-GB')} characters.`,
  toFill: (count: number) => `${count} to fill`,
  toWrite: (count: number) => `${count} to write`,
  stillToFill: 'Still to fill:',
  nothing: 'No outputs for this work.',
} as const
