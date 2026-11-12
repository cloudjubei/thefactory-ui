import { useState } from 'react'
import { FileTree } from '../../src/web/compound/files/FileTree'
import { Input } from '../../src/web/primitives/Input'
import type { Scene } from '../showcase/types'
import { FILE_TREE_FILES_ONLY, FILE_TREE_WITH_EMPTY_FOLDERS } from './fileTreeFixtures'

function Tree({ files }: { files: typeof FILE_TREE_WITH_EMPTY_FOLDERS }) {
  return (
    <div className="max-w-sm rounded-lg border border-(--border-subtle) bg-(--surface-raised) p-2">
      <FileTree files={files} defaultExpandedDepth={2} onSelectFile={() => undefined} />
    </div>
  )
}

/** Filter box + live leaf-file count from `onVisibleCountChange`, then the tree. */
function FilteredTree({
  files,
  query: initialQuery,
}: {
  files: typeof FILE_TREE_WITH_EMPTY_FOLDERS
  query: string
}) {
  const [query, setQuery] = useState(initialQuery)
  const [visibleCount, setVisibleCount] = useState<number | null>(null)
  return (
    <div className="flex max-w-sm flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter files by name or path"
            aria-label="Filter files"
          />
        </div>
        <div
          className="whitespace-nowrap pl-1 text-xs text-(--text-muted)"
          data-testid="visible-file-count"
        >
          {visibleCount === null ? '' : `${visibleCount} files`}
        </div>
      </div>
      <div className="rounded-lg border border-(--border-subtle) bg-(--surface-raised) p-2">
        <FileTree
          files={files}
          query={query}
          defaultExpandedDepth={2}
          onSelectFile={() => undefined}
          onVisibleCountChange={setVisibleCount}
        />
      </div>
    </div>
  )
}

const FILTER_CHOICES = [
  { id: 'none', label: 'No filter', query: '' },
  { id: 'drafts', label: 'drafts (empty folder)', query: 'drafts' },
  { id: 'architecture', label: 'ARCHITECTURE (file)', query: 'ARCHITECTURE' },
  { id: 'no-match', label: 'No match', query: 'zzz-no-match' },
] as const

function queryOf(choiceId: string | undefined): string {
  return FILTER_CHOICES.find((c) => c.id === choiceId)?.query ?? ''
}

export const FILE_TREE_SCENES: Scene[] = [
  {
    id: 'file-tree',
    title: 'Files tree',
    component: 'FileTree',
    group: 'Chat',
    description:
      'The project Files tree, on web and desktop alike, with the same rows on mobile. Folders come from the entries the backend sends, so a folder with nothing in it still has a row and can be renamed or deleted like any other. A filter box narrows the rows; the count beside it is only visible leaf files.',
    states: [
      {
        id: 'empty-folders',
        title: 'Empty folders',
        description:
          '`docs/drafts`, `src/generated` and `uploads` hold nothing and still show as folders.',
        render: () => <Tree files={FILE_TREE_WITH_EMPTY_FOLDERS} />,
      },
      {
        id: 'files-only',
        title: 'Files only',
        description: 'A list with no folder entries: folders come from the file paths.',
        render: () => <Tree files={FILE_TREE_FILES_ONLY} />,
      },
      {
        id: 'filter-empty-folder',
        title: 'Filter matches an empty folder',
        description:
          'Query `drafts` keeps `docs/drafts` (0 files). The count beside the filter is from `onVisibleCountChange`.',
        render: () => <FilteredTree files={FILE_TREE_WITH_EMPTY_FOLDERS} query="drafts" />,
      },
      {
        id: 'filter-file',
        title: 'Filter matches a file',
        description:
          'Query `ARCHITECTURE` keeps one leaf file. The count beside the filter is from `onVisibleCountChange`.',
        render: () => <FilteredTree files={FILE_TREE_WITH_EMPTY_FOLDERS} query="ARCHITECTURE" />,
      },
      {
        id: 'filter-no-match',
        title: 'Filter matches nothing',
        description: 'A query with no rows reports 0 files.',
        render: () => <FilteredTree files={FILE_TREE_WITH_EMPTY_FOLDERS} query="zzz-no-match" />,
      },
    ],
    controls: [
      {
        id: 'filter',
        label: 'Filter',
        kind: 'choice',
        options: FILTER_CHOICES.map(({ id, label }) => ({ id, label })),
        default: 'drafts',
      },
    ],
    presets: FILTER_CHOICES.map(({ id, label }) => ({
      id,
      name: label,
      values: { filter: id },
    })),
    play: (values) => (
      <FilteredTree files={FILE_TREE_WITH_EMPTY_FOLDERS} query={queryOf(values.filter)} />
    ),
  },
]
