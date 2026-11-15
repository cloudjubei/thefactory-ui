import type { ProcessRun } from 'thefactory-tools/types'

/** The run fields the sign-off reads what was carried onto it from. */
export type SignoffCarriedRun = Pick<ProcessRun, 'id' | 'featureId' | 'ledger' | 'plan'>

/** One proving step's points carried onto the sign-off, to try on the build. */
export type SignoffPointsGroup = {
  key: string
  /** "Shown: Dashboard tile" — absent when nothing counted. */
  shown?: string
  points: string[]
}

/** A target a person left out of the proof: what it is, and where it already failed. */
export type SignoffLeftOutRow = {
  key: string
  /** Its files, else its checks. */
  target: string
  detail: string
}

/**
 * What the sign-off shows beside the build to try: the points no proving step
 * showed, carried on by a person, and the targets left out of the proof.
 */
export type SignoffCarriedView = {
  tryThese?: { title: string; note: string; groups: SignoffPointsGroup[] }
  leftOut?: { title: string; rows: SignoffLeftOutRow[] }
}
