/** One change waiting on a run, as the sign-off lists it. */
export type RunPendingChangeItem = {
  id: string
  /** The feature it changes, shown by its number; `undefined` for a step re-run. */
  featureId: string | undefined
  /** How it reads without a feature number: the feature's title, or "Re-run Code review". */
  name: string
  /** `reworked` or `added`, after the feature's number or name; `undefined` for a re-run, whose name says it. */
  kindWord: string | undefined
  summary: string
}

/** The changes waiting on a run, as its pipeline shows them above the sign-off. */
export type RunPendingChangesView = {
  /** "2 changes waiting to start". */
  headline: string
  items: RunPendingChangeItem[]
  /** The ids the start button starts — exactly the ones shown. */
  changeIds: string[]
  /** "Start work on 2 changes". */
  startLabel: string
  canStart: boolean
  /** Why it cannot start yet, or what starting does and that approving waits. */
  hint: string
}
