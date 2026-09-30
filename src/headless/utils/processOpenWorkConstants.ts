/** Starting over a run that is still live. */
export const OPEN_WORK_WARNING_PARALLEL =
  'Running in parallel can conflict: both write to the story’s files.'

/** Starting over work that is done but not merged or signed off. */
export const OPEN_WORK_WARNING_UNREVIEWED =
  'That work is not merged or signed off; building on it builds on unreviewed code.'

export const OPEN_WORK_EXTEND_LABEL = 'Continue on that branch — add to that process'
export const OPEN_WORK_NEW_ON_BRANCH_LABEL = 'Continue on that branch — as a new process'
export const OPEN_WORK_FRESH_LABEL = 'Start on a fresh branch'

/** The mark a risky choice carries. */
export const OPEN_WORK_RISKY_TAG = 'Risky'

/** What a closed sign-off, or a set-aside park, reads as on an extended run. */
export const AMENDMENT_CLOSED_SIGN_OFF =
  'Its waiting sign-off was closed without a decision and is asked again once the new work is done.'
export const AMENDMENT_SET_ASIDE_PARK =
  'The step it was waiting on was set aside; it runs again after the new work.'
export const AMENDMENT_REOPENED_APPROVED =
  'The run had finished and was reopened: its earlier approval was set aside (kept in its history), and it comes back for one new sign-off.'
export const AMENDMENT_REOPENED_ENDED =
  'The run had ended and was reopened; it comes back for one new sign-off.'
