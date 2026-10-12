import type { ProcessManagerParkStatus } from 'thefactory-tools/types'

import type { ProcessStatusTone } from './processView'

/** One line of a run's "Handled for you": what the manager did, why, and how it came out. */
export interface ProcessManagerHandledLineView {
  key: string
  what: string
  why: string
  result: string
  tone: ProcessStatusTone
}

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
  handled: { title: string; lines: ProcessManagerHandledLineView[] }
  preRead?: ProcessManagerPreReadView
}
