/** Whether a judged change shows on screen. */
export type UiImpactTone = 'shows' | 'hidden'

/** One judgement of whether a change alters what users see, as an attempt shows it. */
export interface UiImpactNote {
  tone: UiImpactTone
  /** "Shows on screen", "Nothing on screen", or the code review's lead before either. */
  label: string
  /** Who judged it, when known. */
  by?: string
  reason: string
}

/** Whether the story's change must be shown on screen, as its sign-off shows it. */
export interface ScreensDecisionNote {
  tone: 'needed' | 'not-needed' | 'unknown'
  label: string
  /** What decided it, in one line — naming the files users see a judgement left unshown. */
  reason: string
  /** Every file users see a not-visible judgement left unshown. */
  disputedUiPaths: string[]
}
