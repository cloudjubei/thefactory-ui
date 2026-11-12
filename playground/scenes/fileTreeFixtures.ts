/** Shared Files-tree sample rows for the web scene and the native panel. */

export type FileTreeFixtureEntry = {
  relativePath: string
  isDir?: boolean
}

/** Root and nested empty folders (`docs/drafts`, `src/generated`, `uploads`) plus files. */
export const FILE_TREE_WITH_EMPTY_FOLDERS: FileTreeFixtureEntry[] = [
  { relativePath: 'README.md' },
  { relativePath: 'docs', isDir: true },
  { relativePath: 'docs/ARCHITECTURE.md' },
  { relativePath: 'docs/drafts', isDir: true },
  { relativePath: 'src', isDir: true },
  { relativePath: 'src/index.ts' },
  { relativePath: 'src/generated', isDir: true },
  { relativePath: 'uploads', isDir: true },
]

/** Same paths with no folder entries: folders come only from file path prefixes. */
export const FILE_TREE_FILES_ONLY: FileTreeFixtureEntry[] = FILE_TREE_WITH_EMPTY_FOLDERS.filter(
  (entry) => !entry.isDir,
)
