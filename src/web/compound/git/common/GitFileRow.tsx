import type { DragEvent, MouseEvent } from 'react'
import Tooltip from '../../../primitives/Tooltip'
import { PathDisplay } from '../../PathDisplay'
import { IconDelete, IconFastMerge, IconRevert } from '../../../icons'
import GitFileStatusIcon from './GitFileStatusIcon'
import { GitFileChangesPills } from './GitFileChangesPills'

export type GitLocalFileEntry = {
  path: string
  status?: string
  patch?: string
  binary?: boolean
  isConflicted?: boolean
}

export type GitFileRowProps = {
  file: GitLocalFileEntry
  checked: boolean
  selected?: boolean
  onToggle: (file: GitLocalFileEntry) => void
  onReset: (file: GitLocalFileEntry) => void
  onRemove: (file: GitLocalFileEntry) => void
  onResolveConflict?: (file: GitLocalFileEntry) => void
  draggable?: boolean
  onDragStart?: (e: DragEvent) => void
  onClick?: (e: MouseEvent) => void
}

export default function GitFileRow({
  file,
  checked,
  selected,
  onToggle,
  onReset,
  onRemove,
  onResolveConflict,
  draggable,
  onDragStart,
  onClick,
}: GitFileRowProps) {
  return (
    <div
      className={`group flex items-center justify-between gap-2 px-2 py-1 text-xs border-b border-(--border-subtle) ${selected ? 'bg-sky-50 dark:bg-sky-900/25' : ''} ${file.isConflicted ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      role="row"
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggle(file)}
          onClick={(e) => e.stopPropagation()}
          aria-label={checked ? 'Unstage file' : 'Stage file'}
        />
        <GitFileStatusIcon status={file.status} isConflicted={file.isConflicted} />
        <PathDisplay path={file.path} />
      </div>

      <div className="grid items-center shrink-0 min-h-[20px] justify-items-end pl-2">
        {/* Pills fade out on row hover to make space for actions; never interactive. */}
        <div className="col-start-1 row-start-1 flex items-center justify-end opacity-100 group-hover:opacity-0 transition-opacity pointer-events-none">
          <GitFileChangesPills patch={file.patch} />
        </div>
        {/* Actions fade in on row hover; relative + z-10 + pointer-events keeps clicks reliable. */}
        <div className="col-start-1 row-start-1 relative z-10 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
          {file.isConflicted && onResolveConflict && (
            <Tooltip content="Resolve Conflict" placement="bottom">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded p-1 hover:bg-(--surface-muted) text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400"
                aria-label="Resolve Conflict"
                onClick={(e) => {
                  e.stopPropagation()
                  onResolveConflict(file)
                }}
              >
                <IconFastMerge className="w-4 h-4" />
              </button>
            </Tooltip>
          )}
          <Tooltip content="Reset (discard local changes)" placement="bottom">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded p-1 hover:bg-(--surface-muted) text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              aria-label="Reset file changes"
              onClick={(e) => {
                e.stopPropagation()
                onReset(file)
              }}
            >
              <IconRevert className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip content="Remove (delete file)" placement="bottom">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded p-1 hover:bg-(--surface-muted)"
              aria-label="Remove file"
              onClick={(e) => {
                e.stopPropagation()
                onRemove(file)
              }}
            >
              <IconDelete className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
