import type { ChangeScreensNeed, ProcessUiImpactJudge } from 'thefactory-tools/types'

/** Said of a change judged to alter what users see. */
export const UI_IMPACT_SHOWS_LABEL = 'Shows on screen'

/** Said of a change judged to alter nothing users see. */
export const UI_IMPACT_HIDDEN_LABEL = 'Nothing on screen'

/** Who judged whether a change alters what users see, as the note names them. */
export const UI_IMPACT_JUDGE_WORDS: Readonly<Record<ProcessUiImpactJudge, string>> = {
  developer: 'Judged by the developer',
  'developer-verifier': 'Judged by the developer',
  fixer: 'Judged by the fixer',
  verifier: 'Judged by the verifier',
}

/** Leads a code review's view that differs from how the change was judged before it. */
export const REVIEW_UI_IMPACT_DISAGREES = 'Code review disagrees'

/** Leads a code review's view of a change nobody judged the other way before it. */
export const REVIEW_UI_IMPACT_JUDGED = 'Code review'

/** What the sign-off says of whether the story's change must be shown on screen. */
export const SCREENS_DECISION_LABELS: Readonly<Record<ChangeScreensNeed, string>> = {
  required: 'Screens needed',
  'not-required': 'No screens needed',
  unknown: 'Screens unknown',
}
