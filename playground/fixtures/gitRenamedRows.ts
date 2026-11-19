// Fixed staged diff entries: a cross-folder move, an in-place rename and
// an edited rename with numstat but no textual patch. Both widths/platforms
// settle on the same three rows, with counts only on the final one.
export const GIT_RENAMED_ROWS = [
  {
    status: 'R',
    oldPath: 'src/video/__fixtures__/a.ts',
    path: 'src/video/benchmark/b.ts',
    additions: 0,
    deletions: 0,
  },
  {
    status: 'R',
    renameFrom: 'src/video/clip.ts',
    path: 'src/video/segment.ts',
    additions: 0,
    deletions: 0,
  },
  {
    status: 'R',
    oldPath: 'src/readers/legacy.ts',
    path: 'src/readers/current.ts',
    additions: 4,
    deletions: 2,
  },
]
