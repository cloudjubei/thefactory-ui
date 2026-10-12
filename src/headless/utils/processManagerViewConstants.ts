import type {
  ProcessManagerAutonomy,
  ProcessManagerInterventionOutcome,
} from 'thefactory-tools/types'

import type { ProcessStatusTone } from './processView'

export const PROCESS_MANAGER_SWITCH_ON = 'Manager on'
export const PROCESS_MANAGER_SWITCH_OFF = 'Manager off'
export const PROCESS_MANAGER_SWITCH_DETAIL_ON =
  'The agent manager looks at each stop first and settles what it may — never a sign-off, a stop, a delete or spend. Switch it off to have every stop come straight to you.'
export const PROCESS_MANAGER_SWITCH_DETAIL_OFF =
  'Every stop comes straight to you. Switch the agent manager on to have it look first.'
export const PROCESS_MANAGER_SWITCH_DETAIL_REVERSED =
  'Off because you undid one of its actions — it never repeats that. Switch it on again to let it look at the next stop.'

export const PROCESS_MANAGER_HANDLED_TITLE = (count: number): string => `Handled for you: ${count}`
export const PROCESS_MANAGER_NEEDS_YOU_TITLE = 'The manager needs you'
export const PROCESS_MANAGER_FOUND_LABEL = 'What it found'
export const PROCESS_MANAGER_TRIED_LABEL = 'What it tried'
export const PROCESS_MANAGER_RECOMMENDS_LABEL = 'What it recommends'
export const PROCESS_MANAGER_PRE_READ_TITLE = 'The manager’s pre-read'
export const PROCESS_MANAGER_DISCUSS_LABEL = 'Talk it over in the run’s chat'
export const PROCESS_MANAGER_OPEN_CHAT_LABEL = 'Open the run’s chat'
export const PROCESS_MANAGER_WHY_LABEL = 'because'

/** How each outcome colours its line. */
export const PROCESS_MANAGER_OUTCOME_TONES: Record<
  ProcessManagerInterventionOutcome,
  ProcessStatusTone
> = {
  pending: 'working',
  settled: 'done',
  failed: 'stuck',
  reversed: 'empty',
}

/** The project setting's label and what it means. */
export const PROCESS_MANAGER_PROJECT_LABEL = 'Agent manager'
export const PROCESS_MANAGER_PROJECT_DETAIL =
  'Looks at each stop of this project’s runs first and settles what it may — never a sign-off, a stop, a delete or spend. A process or a launch can still say otherwise.'
export const PROCESS_MANAGER_AUTONOMY_LABEL = 'How far it goes'

/** Each autonomy as the setting offers it. */
export const PROCESS_MANAGER_AUTONOMY_OPTIONS: ReadonlyArray<{
  value: ProcessManagerAutonomy
  label: string
}> = [
  { value: 'act', label: 'Act — carry out what it may, hand on the rest' },
  { value: 'recommend', label: 'Recommend — prepare each answer for one click' },
  { value: 'observe', label: 'Observe — diagnose and post its card only' },
]
