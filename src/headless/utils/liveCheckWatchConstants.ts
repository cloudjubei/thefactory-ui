import type { ProcessGateKind } from 'thefactory-tools/types'

import type { ParkNoteCopy } from './processParkNoteTypes'
import type { LiveCheckWatchState } from './liveCheckWatchTypes'

/** The gate kind an ask-me live check stops at. */
export const LIVE_CHECK_GATE_KIND: ProcessGateKind = 'live-check'

/** The host's line when it could not set the device up. */
export const LIVE_CHECK_WATCH_PROBLEM_PATTERN = / could not set the device up: /

/** The host's line when the device is set up and signed in. */
export const LIVE_CHECK_WATCH_READY_PATTERN = /Watch the change, then say whether it looks right\.$/

/** The card's words. */
export const LIVE_CHECK_WATCH_COPY = {
  title: 'Watch it live',
  walkAfter: 'Check the change on the test account.',
  walkBeforeAndAfter: 'Check the base build first, then the change.',
  noPassesLine: 'No passes left: it can no longer go back to the developer.',
} as const

/** The badge each state wears; none when nothing set the device up. */
export const LIVE_CHECK_WATCH_BADGES: Partial<Record<LiveCheckWatchState, string>> = {
  ready: 'Ready',
  problem: 'Not set up',
}

/** The composer's words when the person sends what they watched to the developer: the note is required. */
export const LIVE_CHECK_SEND_NOTE_COPY: ParkNoteCopy = {
  prompt: 'What did you see? The developer gets your note.',
  submitLabel: 'Send to the developer',
}

/** What a decided "Watch it live" step says on its row, by the choice made. */
export const LIVE_CHECK_WATCH_DECIDED: Readonly<Record<string, string>> = {
  approve: 'Looks right',
  retry: 'Set up again',
  'send-to-developer': 'Sent to the developer',
  abandon: 'Stopped here',
}
