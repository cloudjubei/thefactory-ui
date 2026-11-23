import type { PendingFileChange, PendingFileChangeActions } from 'thefactory-ui/headless'

// Settled states for `file-pane-incoming` (web `/?scene=file-pane-incoming&state=<state>`,
// native `/?view=file-pane-incoming&state=<state>`):
// - `callout`: amber conflict triangle on `docs/release-notes.txt`; opening the callout shows
//   2 remote hunks, 1 conflict, `Source: Agent run release-notes-42`, and Review and merge /
//   Keep mine / Take remote.
// - `deleted`: red triangle on `docs/release-notes.txt`. Once settled the callout is open:
//   `File deleted remotely`, a rename/move is treated as a delete plus a new file,
//   `Source: Agent run release-notes-42`, and Recreate on save / Discard mine.
// - `renamed`: red triangle on `docs/release-notes.txt`. Once settled the callout is open:
//   `File renamed or moved remotely`, names `docs/archive/release-notes.txt`, `Source: A person`,
//   and Recreate on save / Discard mine.
// - `rename-clean`: green triangle on `docs/release-notes.txt`. Once settled the callout is open:
//   `1 hunk changed remotely`, `0 conflicts with your edits. Moved to docs/notes.txt.`,
//   `Source: A person`, Review and merge / Keep mine / Take remote, and Save.
//   Save opens the merge dialog. Keep mine clears the warning and keeps the draft.
//   Take remote clears the warning and shows the remote text.
// - `rename-same`: the same header and draft, with no warning icon. A rename whose read
//   returned the same bytes.

/** Open the warning once, so a settled playground shot shows the callout. */
export function openSettledIncomingCallout(
  root: ParentNode | null,
  label = 'File deleted remotely',
) {
  if (typeof document === 'undefined' || !root || typeof root.querySelector !== 'function') return
  const button = root.querySelector(
    `button[aria-label="${label}"], [role="button"][aria-label="${label}"]`,
  )
  if (button instanceof HTMLElement) button.click()
}

export const incomingFileExample: PendingFileChange = {
  kind: 'conflict',
  remote: 'Release notes\n\nDocument the updated settings panel.\n\nAvailable next Monday.',
  hunks: 2,
  conflicts: 1,
  origin: { kind: 'agent', runId: 'release-notes-42' },
}

export const incomingDeletedFileExample: PendingFileChange = {
  kind: 'deleted',
  remote: null,
  origin: { kind: 'agent', runId: 'release-notes-42' },
}

export const incomingRenamedFileExample: PendingFileChange = {
  kind: 'deleted',
  remote: null,
  renamedTo: 'docs/archive/release-notes.txt',
  origin: { kind: 'person' },
}

export const incomingFilePath = 'docs/release-notes.txt'
export const incomingFileBase = 'Release notes\n\nDocument the settings panel.\n\nAvailable Friday.'
export const incomingFileDraft =
  'Release notes\n\nDraft: add an example for the new settings panel.\n\nAvailable Friday.'

/** One remote hunk that does not overlap the draft, so the merge is clean. */
export const incomingRenameCleanRemote =
  'Release notes\n\nDocument the settings panel.\n\nAvailable next Monday.'

export const incomingRenameCleanFileExample: PendingFileChange = {
  kind: 'clean',
  remote: incomingRenameCleanRemote,
  hunks: 1,
  conflicts: 0,
  renamedTo: 'docs/notes.txt',
  origin: { kind: 'person' },
}

export const incomingFileExampleActions: PendingFileChangeActions = {
  onReviewAndMerge: () => undefined,
  onKeepMine: () => undefined,
  onTakeRemote: () => undefined,
}
