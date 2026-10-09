/** How a commit changes one file, as a git change's card lists it. */
export type GitChangeFileView = {
  path: string
  status: 'added' | 'modified' | 'deleted'
  binary?: boolean
}

/** One commit a git change brings in or drops. */
export type GitChangeCommitView = {
  sha: string
  subject: string
  author: string
  date: string
}

/** An argument the person may change on the card before approving, such as a commit message. */
export type GitChangeEditView = {
  arg: string
  label: string
  value: string
  multiline?: boolean
  required?: boolean
}

/**
 * What the host read from the person's repository for a git change before
 * asking: where, what, as whom, and the change itself.
 */
export type GitChangeCardView = {
  operation: string
  headline: string
  projectId: string
  repoPath: string
  branch?: string
  warning: string
  identity?: { name: string; email: string }
  message?: string
  edits?: GitChangeEditView[]
  diff?: { files: GitChangeFileView[]; patch: string; patchTruncated: boolean }
  commits?: {
    gained: GitChangeCommitView[]
    gainedTotal: number
    dropped: GitChangeCommitView[]
    droppedTotal: number
    fastForward: boolean
  }
  facts: string[]
  danger?: boolean
  run?: { id: string; title: string }
}
