/** One feature edit the run carried out itself, as the sign-off lists it. */
export type RunCarriedOutChangeItem = {
  id: string
  /** The feature it changed, shown by its number. */
  featureId: string
  /** The feature's title, where there is no number to show. */
  name: string
  /** `reworked` or `added`. */
  kindWord: string
  summary: string
}

/** The feature edits a run carried out itself, as its sign-off shows them. */
export type RunCarriedOutChangesView = {
  title: string
  /** Oldest first. */
  items: RunCarriedOutChangeItem[]
}
