import type { ProcessManagerIntervention } from 'thefactory-tools/types'

import type { ProcessCirclingView } from './processCirclingViewTypes'
import type { ParkClosure, ParkStanding } from './processParkStandingTypes'

/** The manager's brief as its card reads: the one line, and what opening it shows. */
export type ManagerBriefView = {
  /** The line between turns: where the run stopped, and when. */
  stopLine: string
  /** The brief in one line. */
  line: string
  /** What the turn is for. */
  mode: string
  /** Where it stopped, and the park's own words. */
  stopped: string
  /** What failed. */
  failed: string[]
  /** The answers the park takes. */
  answers: { key: string; label: string }[]
  /** What the manager tried here, in words. */
  tried: string
  /** Its tries used of the most it gets, as words and as a share. */
  tries: string
  triesShare: number
  /** The limits it works within. */
  limits: string
  /** The step went in circles — a major issue the turn must find the cause of. */
  circling?: ProcessCirclingView
}

/** What came of a manager turn, as its outcome card reads. */
export type ManagerOutcomeView = {
  headline: string
  /** Whether it left the person something to do. */
  tone: 'handled' | 'needs-you'
  pill: string
  why: string
  /** How it came out since, when the run says. */
  result?: string
  /** What it left the person, each with its words — and how it was settled since, once it was. */
  open: { id: string; text: string; settled?: string }[]
  /** The call it made, as "Did:" says it. */
  did: string
  /** How the sign-off it read was decided, once it was. */
  closure?: ParkClosure
}

/** A park the manager handed to the person, as its card reads. */
export type ManagerEscalationView = {
  title: string
  headline: string
  what: string
  found: string
  tried: string[]
  recommendation: string
  /** How the park was closed, once the run no longer waits at it: the card is then history, not an ask. */
  closure?: ParkClosure
}

/** An intervention as the run keeps it now, when it does. */
export type ManagerInterventionStanding = { intervention?: ProcessManagerIntervention }

/** A pre-read's items as settled since, by item id, and how its sign-off was closed, once it was. */
export type ManagerPreReadStanding = {
  settled: Record<string, string>
  closure?: ParkClosure
}

/** Where a manager card's subject stands now, for the card's kind. */
export type ManagerCardStanding =
  | { kind: 'escalation'; standing: ParkStanding }
  | { kind: 'intervention'; standing: ManagerInterventionStanding }
  | { kind: 'pre-read'; standing: ManagerPreReadStanding }
