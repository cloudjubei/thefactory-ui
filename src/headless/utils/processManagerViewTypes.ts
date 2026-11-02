import type {
  ProcessManagerAnswer,
  ProcessManagerMoreTries,
  ProcessManagerParkStatus,
} from 'thefactory-tools/types'

/** The manager's card for a park it handed to the person. */
export interface ProcessManagerEscalationView {
  /** Why it needs the person, in words. */
  reason: string
  /** What happened: the park's line, then the failing lines. */
  what: string[]
  found: string
  tried: string[]
  recommendation: string
  /** The park's answer it recommends, when it named one. */
  recommendedChoice?: string
  /** The run whose stop it handed over — a feature's own run for a feature's stop. */
  runId: string
  /** The answers it prepared, best first — filtered against the stop's choices where shown. */
  answers: ProcessManagerAnswer[]
  /** At a spent limit: whether more of the same would finish the work, with its evidence. */
  moreTries?: ProcessManagerMoreTries
}

/** The manager's read of a sign-off it never decides. */
export interface ProcessManagerPreReadView {
  summary: string
  items: Array<{ itemId: string; finding: string; recommendation: string }>
}

/** Everything a run's page shows of its agent manager. */
export interface ProcessRunManagerView {
  enabled: boolean
  /** The switch's label and what it means now. */
  switchLabel: string
  switchDetail: string
  /** What it is doing on the park the run waits at. */
  status?: { state: ProcessManagerParkStatus; text: string }
  escalation?: ProcessManagerEscalationView
  preRead?: ProcessManagerPreReadView
}
