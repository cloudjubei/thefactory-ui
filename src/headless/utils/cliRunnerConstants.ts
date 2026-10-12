/** Why a row's call did not run, when the user declined its ask. */
export const ASK_DECLINED_REASON = 'You declined it.'
/** Why a row's call did not run, when its ask expired undecided. */
export const ASK_EXPIRED_REASON = 'It expired before you decided.'
/** Why a row's call did not run, when its run was stopped with the ask undecided. */
export const ASK_CANCELLED_REASON = 'Its run was stopped before you decided.'
/** What an approved call carried out before its result was kept on the ask shows as its result. */
export const ASK_CARRIED_OUT_NOTE = 'Approved, and carried out by the agent in a later turn.'

/** A row the person approved on its own card or row. */
export const DECIDED_BY_YOU_NOTE = 'Approved by you'

/** A row the person approved in one Resume over several listed asks. */
export const DECIDED_BY_YOU_APPROVE_ALL_NOTE = 'Approved by you (approve all)'

/** A row the person declined. */
export const DECLINED_BY_YOU_NOTE = 'Declined by you'

/** A row the person declined by writing their next message past it. */
export const DECLINED_BY_MOVING_ON_NOTE = 'Declined — you moved on without approving it'

/** A row a standing grant approved, naming what the grant allows. */
export const DECIDED_BY_RULE_NOTE = (rule: string): string => `Approved by rule: ${rule}`

/** A grant given for the tool itself — every later call of it — and where it applies. */
export const GRANT_RULE_WHOLE_TOOL = (tool: string, where: string): string =>
  `always allow ${tool} ${where}`

/** A grant given for one exact call — the same tool with the same arguments — and where it applies. */
export const GRANT_RULE_EXACT_CALL = (tool: string, where: string): string =>
  `always allow this exact ${tool} call ${where}`

/** A grant whose action names no tool, and where it applies. */
export const GRANT_RULE_UNNAMED = (where: string): string => `always allow this request ${where}`

/** Why a row's call did not run, when its turn ended with the call still open. */
export const TURN_ENDED_REASON = 'Its turn ended before it ran.'
