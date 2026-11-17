/**
 * One version a retry can run: the step's agent type, or the process that
 * step runs. Thefactory-tools names these on the retry choice.
 */
export interface ProcessRetryDefinitionRef {
  kind: 'agent-type' | 'process'
  id: string
  /** The name a person reads — the agent type's label, or the process's name. */
  name: string
  version: number
}

/**
 * The versions a retry of a stopped step will run, and the current ones when
 * any is newer. `frozen` is what this run started with. `current` is present
 * only when a newer definition exists; choosing it runs those instead.
 *
 * thefactory-tools puts this on the retry park choice as `definitions`.
 * Choosing current is `useCurrentDefinitions` on the resume.
 */
export interface ProcessRetryDefinitionsOffer {
  frozen: ProcessRetryDefinitionRef[]
  current?: ProcessRetryDefinitionRef[]
}

/** Which of the two a person picked. Absent, or `frozen`: the versions this run started with. */
export type ProcessRetryDefinitionChoice = 'frozen' | 'current'

/** The version block as the retry card draws it. */
export interface ProcessRetryDefinitionsView {
  heading: string
  /** Set when nothing newer exists: the versions the retry runs, in one line. */
  runs?: string
  /** Set when a newer version exists: both sides, each naming its versions. */
  frozenLabel?: string
  currentLabel?: string
  frozenLine?: string
  currentLine?: string
}
