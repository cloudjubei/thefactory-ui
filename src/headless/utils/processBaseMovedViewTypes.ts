import type { ProcessParkChoice, ProcessResumeChoice } from 'thefactory-tools/types'

/** What a run shows about its base branch: how far it moved on, and what was brought in. */
export type ProcessBaseMovedView = {
  /** "main has 2 new commits" — while the base has commits the work branch lacks. */
  note: string | undefined
  /** The park choice that brings them in and re-checks, while the run's park offers it. */
  choice: (ProcessParkChoice & { choice: ProcessResumeChoice }) | undefined
  /** "Brought in main (2 commits) — the work branch is now at 1a2b3c4." — the newest time it was. */
  lastUpdate: string | undefined
}
