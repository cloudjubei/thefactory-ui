/** An attempt flagged as going in circles, as the run page, its step row and its chat show it. */
export interface ProcessCirclingView {
  /** The flag's short name, "Going in circles". */
  label: string
  /** How it ran out and what shows no progress, as a sentence. */
  headline: string
  /** The evidence, a line each. */
  evidence: string[]
  /** What the manager recommends the person do, once it handed the stop on — shown beside the stop's choices. */
  recommendation?: { heading: string; text: string }
}
