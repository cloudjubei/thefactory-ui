import { GitFileRow } from 'thefactory-ui/web'
import { GIT_RENAMED_ROWS } from '../fixtures/gitRenamedRows'
import type { Scene } from '../showcase/types'

const noop = () => {}

function StagedRenames({ width }: { width: number }) {
  return (
    <div
      className="max-w-full rounded-md border border-(--border-subtle) bg-(--surface-base)"
      style={{ width }}
    >
      <h3 className="px-2 py-1 text-xs font-semibold">Staged files</h3>
      {GIT_RENAMED_ROWS.map((file) => (
        <GitFileRow
          key={file.path}
          file={file}
          checked
          onToggle={noop}
          onReset={noop}
          onRemove={noop}
        />
      ))}
    </div>
  )
}

export const GIT_RENAMED_ROWS_SCENES: Scene[] = [
  {
    id: 'git-renamed-rows',
    title: 'Renamed files',
    component: 'GitFileRow',
    group: 'Primitives',
    description:
      'A staged move, an in-place rename, and a rename with four additions and two deletions.',
    states: [
      { id: 'wide', title: 'Wide · staged files', render: () => <StagedRenames width={640} /> },
      { id: 'narrow', title: 'Narrow · staged files', render: () => <StagedRenames width={320} /> },
    ],
  },
]
