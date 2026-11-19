import { GitFileStatusIcon } from 'thefactory-ui/web'
import type { Scene } from '../showcase/types'

const STATES = [
  ['A', 'Added'],
  ['M', 'Modified'],
  ['D', 'Deleted'],
  ['R', 'Renamed'],
] as const

function FileStatusIcons({ size }: { size: 16 | 24 }) {
  return (
    <div className="flex gap-6">
      {STATES.map(([status, label]) => (
        <div key={status} className="flex flex-col items-center gap-2 text-xs">
          <GitFileStatusIcon status={status} className={size === 16 ? 'h-4 w-4' : 'h-6 w-6'} />
          <span>{label}</span>
        </div>
      ))}
    </div>
  )
}

export const GIT_FILE_STATUS_ICON_SCENES: Scene[] = [
  {
    id: 'git-file-status-icons',
    title: 'File status icons',
    component: 'GitFileStatusIcon · IconFileRenamed',
    group: 'Primitives',
    description: 'Added, modified, deleted and renamed in the same status-icon family.',
    states: [
      { id: 'row-size', title: 'File row · 16 px', render: () => <FileStatusIcons size={16} /> },
      { id: 'full-size', title: 'Full size · 24 px', render: () => <FileStatusIcons size={24} /> },
    ],
  },
]
