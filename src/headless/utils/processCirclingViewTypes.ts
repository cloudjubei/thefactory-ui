/** An attempt flagged as going in circles, as the run page, its step row and its chat show it. */
export interface ProcessCirclingView {
  /** The flag's short name, "Going in circles". */
  label: string
  /** How it ran out and what shows no progress, as a sentence. */
  headline: string
  /** The evidence, a line each. */
  evidence: string[]
  /** What a retry needs, in a line. */
  hint: string
  /** It went in circles again after the manager's own retry — the person has it now. */
  afterManager: boolean
}
