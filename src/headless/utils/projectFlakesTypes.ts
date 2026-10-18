/** One known flaky test of a project, as its checks view lists it. */
export type ProjectFlakeRow = {
  key: string
  /** The test's name, or its file when the run named none. */
  test: string
  /** Its file, with its build module when it has one. */
  file: string
  /** "Seen in 3 runs". */
  seen: string
  /** "2h ago" — when it was last seen. */
  lastSeen: string
  /** "Fix filed: Fix flaky test: adds" — once a fix was filed. */
  fix?: string
}

/** The chip on a check whose tests failed in the full run and passed alone. */
export type CheckFlakyChip = {
  /** "2 flaky". */
  label: string
  /** The tests, by name. */
  detail: string
}
