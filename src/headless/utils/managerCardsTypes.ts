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
}

/** What came of a manager turn, as its outcome card reads. */
export type ManagerOutcomeView = {
  headline: string
  /** Whether it left the person something to do. */
  tone: 'handled' | 'needs-you'
  pill: string
  why: string
  /** What is still open for the person, each with its words. */
  open: { id: string; text: string }[]
  /** The call it made, as "Did:" says it. */
  did: string
}

/** A park the manager handed to the person, as its card reads. */
export type ManagerEscalationView = {
  title: string
  headline: string
  what: string
  found: string
  tried: string[]
  recommendation: string
}
