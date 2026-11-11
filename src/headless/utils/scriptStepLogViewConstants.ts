import type { ScriptAskSource, ScriptTakeOverOutcome } from 'thefactory-tools/types'

import type { ScriptLogBadge } from './scriptStepLogViewTypes'

const plural = (count: number, one: string, many = `${one}s`): string =>
  `${count} ${count === 1 ? one : many}`

/** Every word of a script step's log view. */
export const SCRIPT_STEP_LOG_COPY = {
  sections: (count: number): string => plural(count, 'section'),
  lines: (count: number): string => plural(count, 'line'),
  asks: (count: number): string => plural(count, 'ask'),
  live: (count: number): string => `${count} live`,
  takeOvers: (count: number): string => plural(count, 'take-over'),
  stoppedAt: 'Where it stopped',
  noLog: 'No step log was filed for this step.',
  logUnreadable: 'The step log could not be read.',
  stillRunning: 'The script is running. The step log shows once it ends.',
  loading: 'Loading…',
  unread: (count: number): string => `${plural(count, 'line')} of the step log could not be read.`,
} as const

/** What an ask line's badge says. */
export const SCRIPT_ASK_BADGE: ScriptLogBadge = { label: 'Ask', tone: 'empty' }

/** What a take-over line's badge says when it does not say how it ended. */
export const SCRIPT_TAKE_OVER_BADGE: ScriptLogBadge = { label: 'Take-over', tone: 'review' }

/** How a take-over ended, as its badge says it. */
export const SCRIPT_TAKE_OVER_BADGES: Readonly<Record<ScriptTakeOverOutcome, ScriptLogBadge>> = {
  'handed-back': { label: 'Handed back', tone: 'done' },
  failed: { label: 'Take-over failed', tone: 'stuck' },
}

/** Where an ask's answer came from, as its badge says it. */
export const SCRIPT_SOURCE_BADGES: Readonly<Record<ScriptAskSource, ScriptLogBadge>> = {
  pinned: { label: 'Pinned', tone: 'empty' },
  live: { label: 'Live', tone: 'running' },
}

/** The tone of a line of the script's own kind. */
export const SCRIPT_OWN_KIND_TONE = 'empty' as const
