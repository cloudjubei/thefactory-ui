/** What a run whose stop the manager has says in place of what it needs from the person. */
export const PROCESS_RUN_MANAGER_LINE = {
  looking: (what: string) => `Manager: looking at “${what}”`,
  holding: (dependency: string) => `Manager: holding until ${dependency} is brought in`,
} as const

/** How often surfaces read who has a run's stop again — a manager claim or turn going stale shows without waiting for news. */
export const PROCESS_STOP_CLOCK_MS = 30_000

/** The way into the nested run a park mirrors: to decide it, or — while the manager has it — just to look. */
export const PROCESS_NESTED_RUN_OPEN = {
  decide: 'Open the nested run to decide →',
  quiet: 'Open the nested run →',
} as const
