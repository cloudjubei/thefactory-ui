import type { ChatContext } from '../api/generated'

/** WS topic announcing that a sign-in session opened, shows something else, or ended. */
export const SIGN_IN_SESSIONS_EVENT = 'signInSessions:changed'

/** What a `remoteBrowser:watch` names in place of a project to watch a sign-in session's page. */
export const SIGN_IN_STREAM_SCOPE = '@sign-in'

/** The chat the remote browser's store is given for a sign-in page: none of the routes behind it reads one. */
export const SIGN_IN_BROWSER_CONTEXT: ChatContext = {
  type: 'PROJECT',
  projectId: SIGN_IN_STREAM_SCOPE,
}

export const SIGN_IN_SESSION_TEXT = {
  close: 'Close',
  closesItself: 'This closes by itself once you’re signed in.',
  opening: 'Opening the sign-in page…',
  finishing: 'Finishing…',
  starting: 'Starting the sign-in…',
  openLink: 'Open link',
  copyLink: 'Copy link',
  send: 'Send',
  type: 'Type',
  typeHide: 'Hide what I type',
  keys: 'Keys',
  enter: 'Enter',
  tab: 'Tab',
  backspace: 'Delete',
  timedOut: 'The sign-in was open too long and closed. Start it again when you’re ready.',
  failed: 'The sign-in stopped before it finished.',
  answerFailed: 'That wasn’t taken.',
  closeFailed: 'The sign-in didn’t close.',
  onlyThisPage: 'A sign-in shows only its own page.',
} as const
