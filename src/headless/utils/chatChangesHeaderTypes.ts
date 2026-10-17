/** What the head of a chat's change card is drawn from. */
export type ChatChangesHeaderInput = {
  fileCount: number
  /** The branch the changes wait on, when they were committed to one. */
  branch?: string
  /** The review is kept for a project with no git of its own: no branch to name. */
  shadow?: boolean
}

/** The head of a chat's change card, as it shows. */
export type ChatChangesHeaderView = {
  title: string
  /** How many files, and where they wait. */
  meta: string
  /** The branch to show beside it, when there is one. */
  branch?: string
}
