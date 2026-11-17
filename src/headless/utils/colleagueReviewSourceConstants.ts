import type { ReviewOfferLayout, SlackSettingsLayout } from './colleagueReviewSourceTypes'
import type { InkChannel } from './inkBadgeTypes'

/** The provider name of a Slack connection. */
export const SLACK_PROVIDER = 'slack'

/** The name a new Slack connection takes. */
export const SLACK_CONNECTION_NAME = 'Slack'

/** Where Slack sends a sign-in back to, under the backend's address. */
export const SLACK_OAUTH_CALLBACK_PATH = '/api/v1/provider-connections/oauth/callback'

/** The backend's address when the client cannot tell it. */
export const DEFAULT_BACKEND_ORIGIN = 'http://localhost:7001'

/** The badge colour waiting updates take: the person's colour for requests, as new tickets do. */
export const REVIEW_OFFERS_CHANNEL: InkChannel = 'cross-project'

export const REVIEW_OFFER_LAYOUTS: readonly ReviewOfferLayout[] = ['chip', 'strip', 'button']

/** The layout that ships. */
export const REVIEW_OFFER_DEFAULT_LAYOUT: ReviewOfferLayout = 'strip'

export const REVIEW_OFFER_LAYOUT_LABELS: Record<ReviewOfferLayout, string> = {
  chip: 'A chip on the row',
  strip: 'A line under the row',
  button: 'On the Review button',
}

export const SLACK_SETTINGS_LAYOUTS: readonly SlackSettingsLayout[] = ['steps', 'card', 'rows']

/** The layout that ships. */
export const SLACK_SETTINGS_DEFAULT_LAYOUT: SlackSettingsLayout = 'steps'

export const SLACK_SETTINGS_LAYOUT_LABELS: Record<SlackSettingsLayout, string> = {
  steps: 'Two steps',
  card: 'One card',
  rows: 'Settings rows',
}

export const SLACK_SETTINGS_TEXT = {
  heading: 'Slack',
  intro: 'Read colleagues’ updates from a Slack thread, and post replies back to it.',
  connectStep: 'Connect Slack',
  threadStep: 'Watch a review thread',
  why: 'Slack signs you in through an app in your own workspace, so nothing is shared beyond it.',
  clientId: 'Client ID',
  clientIdHint: 'Your Slack app → Basic Information → App Credentials.',
  clientIdPlaceholder: '1234567890.1234567890',
  clientIdProblem: 'A client ID looks like 1234567890.1234567890.',
  redirectUrl: 'Redirect URL',
  redirectUrlHint: 'Add it under OAuth & Permissions → Redirect URLs.',
  copy: 'Copy',
  signIn: 'Sign in with Slack',
  signInAgain: 'Sign in again',
  signInAgainWhy: 'Slack asked you to sign in again.',
  cannotSignIn: 'This server cannot sign in to Slack yet.',
  connected: 'Connected',
  needsSignIn: 'Sign in again',
  threadLink: 'Thread link',
  threadLinkHint: 'In Slack: the thread’s ⋯ menu → Copy link.',
  threadPlaceholder: 'https://your-team.slack.com/archives/C0…/p1…',
  existingReplies: 'Also offer replies already in the thread',
  watch: 'Watch',
  change: 'Change',
  clear: 'Clear',
  cancel: 'Cancel',
  open: 'Open in Slack',
  connectFirst: 'Connect Slack first.',
  notSlackLink: 'That is not a link to a Slack message.',
  clearTitle: 'Stop watching this thread?',
  clearBody: 'New replies are no longer offered. Updates already offered stay.',
  clearConfirm: 'Stop watching',
  ready: 'Ready',
  notOffering: 'Not offering',
  signInAgainLabel: 'Sign in again',
  connectionGone: 'No connection',
  saving: 'Saving…',
  noTicketBinding: 'No updates are offered: this group has no Jira connection.',
  connectionGoneWhy: 'The Slack connection it was read through is gone.',
  notReadYet: 'Not read yet',
  readAgo: (ago: string) => `Read ${ago}`,
  replies: (n: number) => `${n} ${n === 1 ? 'reply' : 'replies'}`,
  newUpdates: (n: number) => `${n} new ${n === 1 ? 'update' : 'updates'}`,
  failedAgo: (ago: string) => `Last read failed ${ago}`,
  signInAgainAgo: (ago: string) => `Last read ${ago}: Slack asked you to sign in again`,
  connectionMissingAgo: (ago: string) => `Last read ${ago}: the connection is gone`,
  notOfferingAgo: (ago: string) => `Not read ${ago}: no updates are offered`,
  notRecordedAgo: (ago: string) => `Read ${ago}: the thread changed meanwhile, it is read again`,
  updatesLine: (offers: string) => `Updates: ${offers}`,
  waiting: (n: number) => `${n} waiting`,
  started: (n: number) => `${n} started`,
  dismissed: (n: number) => `${n} dismissed`,
  readFailed: 'Could not read the watched thread.',
  watchFailed: 'The thread is not watched.',
  clearFailed: 'The thread is still watched.',
} as const

export const REVIEW_OFFER_TEXT = {
  update: (author: string) => `Update from ${author}`,
  nextUpdate: (author: string) => `New update from ${author}`,
  open: 'Open in Slack',
  dismiss: 'Dismiss',
  dismissHint: (key: string) => `Dismiss the update on ${key}`,
  dismissFailed: 'The update was not dismissed.',
  review: 'Review update',
  fromSlack: (author: string, when: string) => `From ${author} in Slack · ${when}`,
  slackFiles: 'From Slack',
  reading: 'Reading the update…',
  readFailed: 'Could not read the update from Slack. Paste it, or try again.',
  badge: (n: number) => `${n} new ${n === 1 ? 'update' : 'updates'}`,
} as const

export const REVIEW_POST_TEXT = {
  post: 'Post in thread',
  postAgain: 'Post again',
  posting: 'Posting…',
  posted: 'Posted in thread',
  confirmTitle: 'Post in thread?',
  confirmAgainTitle: 'Post again?',
  confirmBody: 'Posted as you in the group’s Slack thread, word for word:',
  confirmAgainBody: 'It is in the thread already. This posts it a second time, word for word:',
  confirm: 'Post',
  confirmAgain: 'Post again',
  cancel: 'Cancel',
  failed: 'The reply was not posted.',
  hintPost: 'Post it in the thread, or copy it.',
} as const
