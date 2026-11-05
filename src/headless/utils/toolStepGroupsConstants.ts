/** Fewest consecutive tool-call rows that fold into one line. One call stays its own row. */
export const TOOL_STEP_FOLD_MIN = 2

/** The collapsed line a run of tool-call rows reads as. */
export const TOOL_STEPS_LABEL = (count: number): string =>
  `${count} ${count === 1 ? 'step' : 'steps'}`
