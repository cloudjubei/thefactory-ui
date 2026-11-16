/** How a run's changes read on its sign-off: the Changes chip, the line on the merge question and the report's section. */
export const PROCESS_CHANGES_TEXT = {
  title: 'What changed',
  chip: 'Changes',
  none: 'No changes',
  chipNone: 'none',
  open: 'See changes',
  reading: 'Reading the changes…',
  seamsIncluded:
    'The test seams could not be separated from this work, so they are shown with it. They are left out when it merges.',
  binary: 'Binary file.',
  noText: 'No textual diff.',
} as const

/** "1 file" / "3 files". */
export const PROCESS_CHANGES_FILES = (n: number): string => `${n} ${n === 1 ? 'file' : 'files'}`

/** Why a run's changes show nothing, when they could not be read and the server did not say. */
export const PROCESS_CHANGES_UNREADABLE = 'The changes could not be read.'
