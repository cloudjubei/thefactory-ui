/** The agent tool a stop's ask is raised for. */
export const STOP_ACTIVITY_TOOL_NAME = 'stopActivity'

/** The stop's card copy: short, plain, and never claiming the stop before it happens. */
export const ACTIVITY_STOP_COPY = {
  ask: 'Stop a background activity',
  tag: "Can't resume",
  verb: 'Stop it',
  consequence:
    'Its work ends and is waited for, as does anything it started. What it made so far is kept. It won’t start again — run it anew to continue.',
  unknownType: 'Activity',
  unavailable: 'The activity’s details couldn’t be read. Stop it only if you know which one it is.',
  type: 'Type',
  status: 'Status',
  elapsed: 'Elapsed',
  elapsedHint: 'since recorded start, queue included',
  cost: 'Cost so far',
  costUnknown: 'Not recorded',
  alsoStops: 'Also stops',
  alsoStopsCount: (n: number) => `${n} it started`,
  started: 'Started',
  noParams: 'No launch parameters recorded',
  paramsTooLarge: 'Launch parameters too large to show',
  redacted: (paths: string[]) => `Left out as secret: ${paths.join(', ')}`,
  status_queued: 'Queued',
  status_running: 'Running',
  status_paused: 'Paused — interrupted, not progressing',
  status_completed: 'Completed',
  status_failed: 'Failed',
  status_aborted: 'Stopped',
} as const

/** The stop's result, in one line each. */
export const ACTIVITY_STOP_OUTCOME_COPY = {
  stopped: 'Stopped — its work has ended',
  noop: (status: string) => `Already ${status} — nothing changed`,
  notStopped: (status: string) => `Not stopped — it is ${status}`,
  failed: 'Couldn’t confirm it stopped — it may still be running',
  refused: (reason: string) => `Not stopped — ${reason}`,
  refusedReason: 'nothing was touched',
  childrenAllStopped: (n: number) => `Also stopped ${n} it started`,
  childrenStopped: (stopped: number, n: number) => `Stopped ${stopped} of ${n} it started`,
  childrenEnded: (n: number) => `${n} had already ended`,
  childrenUnconfirmed: (n: number) => `${n} may still be running`,
} as const

/** Why a stop was refused before anything was touched, by the code it returned. */
export const ACTIVITY_STOP_REFUSAL_REASONS: Readonly<Record<string, string>> = {
  'approval-replayed': 'that approval was already used',
  'approval-denied': 'you declined it',
  'approval-required': 'it needs your approval',
  'approval-invalid': 'the approval didn’t match this stop',
  'target-changed': 'the activity changed since you approved',
  'not-found': 'no such activity',
  'invalid-request': 'no activity was named',
  'project-required': 'no project was given',
  'untrusted-context': 'this chat can’t stop it',
}
