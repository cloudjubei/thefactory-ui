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
  /** Free text (the default), a pick among the project's branches, or an on/off switch valued `'true'` / `'false'`. */
  kind?: 'text' | 'branch' | 'toggle'
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

/** A file a commit holds, as its receipt lists it: its status as one letter. */
export type CommitReceiptFile = GitChangeFileView & { letter: string }

/** The one line a successful commit leaves in the chat, and what it opens to. */
export type CommitReceiptView = {
  /** The commit, short. */
  sha: string
  /** The commit as the repository names it. */
  fullSha: string
  branch: string | undefined
  /** "1 file" — absent when the ask kept no list of its files. */
  filesLabel?: string
  files: CommitReceiptFile[]
  message: string | undefined
}
