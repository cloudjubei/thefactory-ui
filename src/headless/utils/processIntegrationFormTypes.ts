/** One commit or pull request, as the host will show it. */
export interface ProcessIntegrationPreviewEntry {
  title: string
  body?: string
  /** Who made it: "Name <email> committed", or who opened the pull request. */
  byline: string
}

/** How the landed work will read where people look at it. */
export interface ProcessIntegrationPreview {
  /** "As it will show on GitHub". */
  where: string
  entries: ProcessIntegrationPreviewEntry[]
  /** How many more commits come that are not listed. */
  more?: number
  /** One line on what lands — one commit, a merge commit, or none. */
  note?: string
}
