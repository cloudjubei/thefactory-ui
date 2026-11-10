import { FileTree, type FileTreeEntry } from '../../src/web/compound/files/FileTree'
import type { Scene } from '../showcase/types'

const WITH_EMPTY_FOLDERS: FileTreeEntry[] = [
  { relativePath: 'README.md' },
  { relativePath: 'docs', isDir: true },
  { relativePath: 'docs/ARCHITECTURE.md' },
  { relativePath: 'docs/drafts', isDir: true },
  { relativePath: 'src', isDir: true },
  { relativePath: 'src/index.ts' },
  { relativePath: 'src/generated', isDir: true },
  { relativePath: 'uploads', isDir: true },
]

const FILES_ONLY: FileTreeEntry[] = WITH_EMPTY_FOLDERS.filter((entry) => !entry.isDir)

function Tree({ files }: { files: FileTreeEntry[] }) {
  return (
    <div className="max-w-sm rounded-lg border border-(--border-subtle) bg-(--surface-raised) p-2">
      <FileTree files={files} defaultExpandedDepth={2} onSelectFile={() => undefined} />
    </div>
  )
}

export const FILE_TREE_SCENES: Scene[] = [
  {
    id: 'file-tree',
    title: 'Files tree',
    component: 'FileTree',
    group: 'Chat',
    description:
      'The project Files tree, on web and desktop alike, with the same rows on mobile. Folders come from the entries the backend sends, so a folder with nothing in it still has a row and can be renamed or deleted like any other.',
    states: [
      {
        id: 'empty-folders',
        title: 'Empty folders',
        description:
          '`docs/drafts`, `src/generated` and `uploads` hold nothing and still show as folders.',
        render: () => <Tree files={WITH_EMPTY_FOLDERS} />,
      },
      {
        id: 'files-only',
        title: 'Files only',
        description: 'A list with no folder entries: folders come from the file paths.',
        render: () => <Tree files={FILES_ONLY} />,
      },
    ],
  },
]
