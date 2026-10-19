const files = (count: number): string => `${count} ${count === 1 ? 'file' : 'files'}`

/** What the marker under a turn, the bar above the message box and the opened review say. */
export const CHAT_CHANGES_DOCK_COPY = {
  changed: (count: number): string => `Changed ${files(count)}`,
  notCommitted: 'Changes not committed',
  stageReport: 'Stage report',
  reviewBelow: 'Review below',
  review: 'Review',
  open: 'Open',
  merged: 'Merged',
  rejected: 'Rejected',
  applied: 'Applied',
  barTitle: (count: number): string =>
    `${files(count)} ${count === 1 ? 'waits' : 'wait'} for your decision`,
  barShortTitle: (count: number): string =>
    `${files(count)} ${count === 1 ? 'waits' : 'wait'} for you`,
  unfit: 'No longer fits your checkout',
  failedChecks: (count: number): string =>
    count === 1 ? '1 check didn’t pass' : `${count} checks didn’t pass`,
  checksPassed: 'Checks passed',
  partlyChecked: 'Partly checked',
  notChecked: 'Not checked yet',
  reviewTitle: (count: number): string => `Changes · ${files(count)}`,
  reviewTitlePending: 'Changes',
  backToChat: 'Chat',
  close: 'Close',
} as const

/** The narrowest chat that opens a review beside itself; narrower, it opens over the chat. */
export const CHAT_REVIEW_SIDE_MIN_WIDTH = 768

/** The opened review's width beside the chat until the person drags it. */
export const CHAT_REVIEW_PANEL_DEFAULT_WIDTH = 460

/** The narrowest the review beside the chat can be dragged. */
export const CHAT_REVIEW_PANEL_MIN_WIDTH = 360

/** What the chat itself always keeps beside an opened review. */
export const CHAT_REVIEW_CHAT_MIN_WIDTH = 360
