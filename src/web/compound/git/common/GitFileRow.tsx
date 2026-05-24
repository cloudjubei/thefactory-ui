import type { DragEvent, MouseEvent } from 'react'
import Tooltip from '../../../primitives/Tooltip'
import { PathDisplay } from '../../PathDisplay'
import { IconDelete, IconDotsVertical, IconFastMerge, IconRevert } from '../../../icons'
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

      <div className="flex items-center shrink-0 min-h-5 justify-end pl-2 gap-1">
        {/* Pills: always visible on narrow (no hover) so the +/- counts stay
            readable on touch; on desktop they fade out on hover to make space
            for the inline action buttons. */}
        <div className="flex items-center justify-end opacity-100 md:group-hover:opacity-0 transition-opacity pointer-events-none">
          <GitFileChangesPills patch={file.patch} />
        </div>
        {/* Desktop actions — only show at md+ on row hover; non-interactive
            on narrow (touch has no hover, and the overflow menu below covers
            those entry points). */}
        <div className="relative z-10 hidden md:flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
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
        {/* Touch overflow menu — only on narrow viewports. Tap to pin a small
            popover with the same actions the hover row exposes. */}
        <div className="md:hidden" onClick={(e) => e.stopPropagation()}>
          <Tooltip
            placement="bottom"
            anchorAs="button"
            anchorClassName="inline-flex items-center justify-center rounded p-1 text-(--text-secondary) hover:bg-(--surface-muted)"
            content={
              <div
                className="flex flex-col py-1 min-w-45"
                onClick={(e) => e.stopPropagation()}
              >
                {file.isConflicted && onResolveConflict ? (
                  <button
                    type="button"
                    className="flex items-center gap-2 px-3 py-2 text-left text-sm text-amber-700 dark:text-amber-300 hover:bg-(--surface-hover)"
                    onClick={() => onResolveConflict(file)}
                  >
                    <IconFastMerge className="w-4 h-4" />
                    Resolve conflict
                  </button>
                ) : null}
                <button
                  type="button"
                  className="flex items-center gap-2 px-3 py-2 text-left text-sm text-red-700 dark:text-red-300 hover:bg-(--surface-hover)"
                  onClick={() => onReset(file)}
                >
                  <IconRevert className="w-4 h-4" />
                  Discard local changes
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 px-3 py-2 text-left text-sm text-(--text-primary) hover:bg-(--surface-hover)"
                  onClick={() => onRemove(file)}
                >
                  <IconDelete className="w-4 h-4" />
                  Delete file
                </button>
              </div>
            }
          >
            <IconDotsVertical className="w-4 h-4" />
            <span className="sr-only">Actions for {file.path}</span>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
