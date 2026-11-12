/** A park's spend raise as a field: what it raises, what was spent, and the amount typed. */
export interface ProcessRetrySpendView {
  label: string
  hint: string
  unit: '$'
  /** What the field holds. */
  text: string
  /** Why it cannot be the raise. */
  error?: string
}
