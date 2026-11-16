import type { GitFileChange, ProcessRunChanges } from 'thefactory-tools/types'

import { GIT_DIFF_SUPPRESSED_MESSAGE } from './gitDiffConstants'
import { PROCESS_CHANGES_FILES, PROCESS_CHANGES_TEXT } from './processRunChangesConstants'
import type { GitChangeFile, ProcessChangesBody } from './processRunChangesTypes'
import type { ReportSectionView } from './signoffReportTypes'

const changeStatus = (status: GitFileChange['status']): GitChangeFile['status'] =>
  status === 'A' ? 'A' : status === 'D' ? 'D' : 'M'

/**
 * A file of a git diff as the Changes view shows it: added and deleted as
 * themselves, renames and the rest as modified, and why there is no patch
 * when there is none. Pure.
 */
export function gitDiffChangeFile(file: GitFileChange): GitChangeFile {
  if (file.patch) return { path: file.path, status: changeStatus(file.status), patch: file.patch }
  const note = file.patchSuppressed
    ? GIT_DIFF_SUPPRESSED_MESSAGE
    : file.binary
      ? PROCESS_CHANGES_TEXT.binary
      : PROCESS_CHANGES_TEXT.noText
  return { path: file.path, status: changeStatus(file.status), note }
}

const stat = (added: number | undefined, removed: number | undefined): string =>
  `+${added ?? 0} −${removed ?? 0}`

/** "1 file · +1 −0", or that nothing changed. Pure. */
export function processChangesSummary(changes: Pick<ProcessRunChanges, 'diff'>): string {
  const { files, insertions, deletions } = changes.diff
  if (files.length === 0) return PROCESS_CHANGES_TEXT.none
  return `${PROCESS_CHANGES_FILES(files.length)} · ${stat(insertions, deletions)}`
}

/** The Changes chip: how many files once they are read, "none" when there are none. Pure. */
export function processChangesChipLabel(files: number | undefined): string {
  if (files === undefined) return PROCESS_CHANGES_TEXT.chip
  const count = files === 0 ? PROCESS_CHANGES_TEXT.chipNone : PROCESS_CHANGES_FILES(files)
  return `${PROCESS_CHANGES_TEXT.chip} · ${count}`
}

/** The report's "What changed": each file with its lines, open while there is any. Pure. */
export function processChangesSection(
  changes: ProcessRunChanges,
): ReportSectionView<ProcessChangesBody> {
  const rows = changes.diff.files.map((file) => ({
    key: file.path,
    path: file.path,
    status: changeStatus(file.status),
    stat: stat(file.additions, file.deletions),
  }))
  return {
    title: PROCESS_CHANGES_TEXT.title,
    summary: processChangesSummary(changes),
    body: {
      rows,
      note: changes.seamsIncluded ? PROCESS_CHANGES_TEXT.seamsIncluded : undefined,
    },
    open: rows.length > 0,
    attention: false,
  }
}
