/** One version of a process, as its statistics read. */
export type ProcessStatisticsRow = {
  version: string
  runs: string
  firstPass: string
  iterations: string
  /** Absent when no run stated a charge. */
  cost?: string
}
