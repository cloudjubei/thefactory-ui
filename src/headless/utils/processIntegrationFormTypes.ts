import type { ProcessIntegrationDecision, ProcessIntegrationMode } from 'thefactory-tools/types'

/** What a person is filling in to say how approved work lands. */
export interface ProcessIntegrationForm {
  mode: ProcessIntegrationMode
  /** Merge or squash: the credential whose name and email the commits are made as. */
  identityId?: string
  /** Merge or squash: the commit message, as written. */
  message: string
  /** Pull request: the credential it is pushed and opened as. */
  accountId?: string
  prTitle: string
  prBody: string
}

/** A form that can be sent, or what stops it. */
export type ProcessIntegrationFormResult =
  | { decision: ProcessIntegrationDecision }
  | { problem: string }

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
