import type { SupervisorAction } from './supervisorPanelTypes'

export const SUPERVISOR_PANEL_COPY = {
  title: 'Supervisor',
  switchLabel: 'Supervisor',
  on: 'On: answers routine stops and starts queued work; hands you the rest with an answer ready.',
  off: 'Off: every stop waits for you.',
  fallback: (model: string): string => `On a credit stop it moves the run to ${model}`,
  actions: 'What it did',
  noActions: 'Nothing yet.',
  asks: 'What it asks you',
  noAsks: 'Nothing waits for you.',
  recommended: 'Recommended',
  toolAsks: (count: number): string =>
    count === 1 ? '1 tool call waits for approval' : `${count} tool calls wait for approval`,
  openChat: 'Open its chat',
  switchFailed: 'The supervisor did not switch.',
  loadFailed: 'The supervisor could not be read.',
} as const

type ActionKind = SupervisorAction['kind']

/** Why it acted, by what it did; the record keeps only what and how it came out. */
export const SUPERVISOR_ACTION_WHY: Readonly<Record<ActionKind, string>> = {
  answered: 'A routine stop: answered as you would.',
  asked: 'It changes behaviour, so it is yours.',
  approved: 'You approved its ask.',
  'closed-ask': 'What it asked was settled elsewhere.',
  started: 'Next in the queue, with a slot free.',
  refused: 'The start was refused.',
}

/** What "Did:" names when the action carried no tool or choice. */
export const SUPERVISOR_ACTION_DID: Readonly<Record<ActionKind, string>> = {
  answered: 'answer',
  asked: 'ask',
  approved: 'approve',
  'closed-ask': 'close ask',
  started: 'start queued work',
  refused: 'start queued work',
}
