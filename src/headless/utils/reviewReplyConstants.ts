import type { ReviewReplyBannerLayout } from './reviewReplyTypes'

/** How many lines of a reply show before "Show all". */
export const REVIEW_REPLY_PREVIEW_LINES = 4

/** How many characters of a reply show before "Show all", for one long line. */
export const REVIEW_REPLY_PREVIEW_CHARS = 280

export const REVIEW_REPLY_TEXT = {
  replied: (author: string) => `${author} replied`,
  someone: 'Someone',
  start: (round: number) => `Start round ${round}`,
  starting: 'Starting…',
  openChat: 'Open review chat',
  openRun: 'Open run',
  show: 'Show',
  hide: 'Hide',
  notNow: 'Not now',
  showAll: 'Show all',
  showLess: 'Show less',
  files: (n: number) => `${n} ${n === 1 ? 'file' : 'files'}`,
  failed: 'The round did not start.',
} as const

export const REVIEW_REPLY_BANNER_LAYOUTS: readonly ReviewReplyBannerLayout[] = ['strip', 'line']

/** The layout that ships. */
export const REVIEW_REPLY_BANNER_DEFAULT_LAYOUT: ReviewReplyBannerLayout = 'strip'

export const REVIEW_REPLY_BANNER_LAYOUT_LABELS: Record<ReviewReplyBannerLayout, string> = {
  strip: 'Strip above the tabs',
  line: 'Line in the header',
}
