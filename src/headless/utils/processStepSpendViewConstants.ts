/** What the run head's step spend chip says on hover. */
export const PROCESS_STEP_SPEND_TITLE =
  'The most one step may spend. A step that reaches it stops after that turn and waits for you.'

/** The chip's words for a limit, in dollars. */
export const PROCESS_STEP_SPEND_CHIP = (amount: string): string => `${amount} a step`
