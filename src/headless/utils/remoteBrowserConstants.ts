import type { RemoteBrowserMode, RemoteBrowserState } from './remoteBrowserTypes'

export const REMOTE_BROWSER_EVENT = {
  frame: 'remoteBrowser:frame',
  ended: 'remoteBrowser:ended',
  refused: 'remoteBrowser:watch-refused',
  changed: 'remoteBrowser:sessions-changed',
} as const

export const REMOTE_BROWSER_MESSAGE = {
  watch: 'remoteBrowser:watch',
  unwatch: 'remoteBrowser:unwatch',
} as const

/** A drag shorter than this, either way, is a press, not an area. */
export const REMOTE_BROWSER_MIN_MARK_PX = 6

/** A pick's box until the browser says what it found: a ring around the point pressed. */
export const REMOTE_BROWSER_PICK_RING_PX = 16

/** Moves go no more often than this; the page sees hover without a request per pixel. */
export const REMOTE_BROWSER_MOVE_EVERY_MS = 80

/** The view's size settles this long before the browser is resized to it. */
export const REMOTE_BROWSER_RESIZE_AFTER_MS = 250

/** Keys sent by name; any other single character is typed as text. */
export const REMOTE_BROWSER_NAMED_KEYS: readonly string[] = [
  'Enter',
  'Tab',
  'Backspace',
  'Delete',
  'Escape',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'PageUp',
  'PageDown',
]

export const REMOTE_BROWSER_MODES: readonly { value: RemoteBrowserMode; label: string }[] = [
  { value: 'browse', label: 'Browse' },
  { value: 'pick', label: 'Pick' },
  { value: 'mark', label: 'Mark' },
]

export const REMOTE_BROWSER_TEXT = {
  open: 'Browser',
  openLabel: 'Open a browser beside the chat',
  address: 'Address',
  addressPlaceholder: 'Type a web address',
  back: 'Back',
  forward: 'Forward',
  reload: 'Reload',
  close: 'Close browser',
  modes: 'What a press does',
  page: 'Page',
  youDrive: 'You’re driving',
  agentDrives: 'Agent driving',
  takeOver: 'Take over',
  handBack: 'Hand back',
  agentCursor: 'Agent',
  pickTitle: (n: number) => `Pick ${n}`,
  markTitle: (n: number) => `Area ${n}`,
  area: (width: number, height: number) => `Area ${width} × ${height}`,
  size: (width: number, height: number) => `${width} × ${height}`,
  noteLabel: 'Note for the agent (optional)',
  cancel: 'Cancel',
  add: 'Add to message',
  notes: 'Browser notes',
  emptyTitle: 'Open a page',
  emptyBody: 'Type an address above to see any website here, beside the chat.',
  reconnectingTitle: 'Reconnecting…',
  reconnectingBody:
    'The browser stopped answering. The page comes back where it was; your notes are kept.',
  tryNow: 'Try now',
  endedTitle: 'Browser closed',
  endedBody: 'This browser was closed. Your notes are kept.',
  openAgain: 'Open again',
  badAddress: 'Type an http or https address.',
  openFailed: 'The page didn’t open.',
  closeFailed: 'The browser didn’t close.',
  inputFailed: 'The page didn’t take that.',
  noteFailed: 'Nothing was picked there.',
  dismiss: 'Dismiss',
  typeOnPage: 'Type on the page',
  messages: (count: number) => `${count} message${count === 1 ? '' : 's'}`,
} as const

export const REMOTE_BROWSER_EMPTY_STATE: RemoteBrowserState = {
  sessions: [],
  shownId: null,
  address: '',
  title: '',
  status: 'idle',
  frame: null,
  mode: 'browse',
  takenOver: false,
  draft: null,
  notes: [],
  history: [],
  historyAt: -1,
  error: null,
}
