import { useEffect, useRef, useState, type DragEvent, type MouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
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
        {/* md+: pills and inline actions share the same slot. Pills sit in
            normal flow (so the row reserves their width) and the actions
            overlay them on row hover via absolute positioning — pills
            `invisible` on hover so they don't bleed through. On narrow
            viewports the actions block is `hidden` and the overflow menu
            covers the same entry points (touch has no hover). */}
        <div className="relative inline-flex items-center justify-end">
          <div className="flex items-center md:group-hover:invisible">
            <GitFileChangesPills patch={file.patch} />
          </div>
          <div className="hidden md:group-hover:flex absolute inset-y-0 right-0 z-10 items-center gap-1">
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
        {/* Touch overflow menu — only on narrow viewports. Controlled
            state + a portal so clicking an action runs the handler AND
            dismisses the popover in the same tick (the Tooltip primitive
            would stay pinned and visually overlap any ConfirmDialog the
            handler opens). */}
        <div className="md:hidden">
          <RowOverflowMenu
            file={file}
            onReset={onReset}
            onRemove={onRemove}
            onResolveConflict={onResolveConflict}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Self-contained "⋮" popover for narrow-viewport file rows. Owns its
 * open/close state so each menu item can both fire its callback AND
 * dismiss the popover before any follow-up modal (ConfirmDialog) renders.
 */
function RowOverflowMenu({
  file,
  onReset,
  onRemove,
  onResolveConflict,
}: {
  file: GitLocalFileEntry
  onReset: (file: GitLocalFileEntry) => void
  onRemove: (file: GitLocalFileEntry) => void
  onResolveConflict?: (file: GitLocalFileEntry) => void
}) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement | null>(null)

  // Reposition on open / window resize. Read inside an effect because
  // `getBoundingClientRect()` is only meaningful after layout.
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  useEffect(() => {
    if (!open || !btnRef.current) return
    const measure = () => setAnchor(btnRef.current?.getBoundingClientRect() ?? null)
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [open])

  const run = (cb: () => void) => {
    setOpen(false)
    cb()
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={`Actions for ${file.path}`}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className="inline-flex items-center justify-center rounded p-1 text-(--text-secondary) hover:bg-(--surface-muted)"
      >
        <IconDotsVertical className="w-4 h-4" />
      </button>
      {open
        ? createPortal(
            <>
              <button
                type="button"
                aria-label="Dismiss menu"
                onClick={(e) => {
                  e.stopPropagation()
                  setOpen(false)
                }}
                className="fixed inset-0 z-40 cursor-default"
              />
              <div
                role="menu"
                className="fixed z-50 flex flex-col rounded-md border border-(--border-subtle) bg-(--surface-base) py-1 shadow-xl min-w-45"
                style={{
                  top: (anchor?.bottom ?? 0) + 4,
                  right: Math.max(8, window.innerWidth - (anchor?.right ?? window.innerWidth - 8)),
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {file.isConflicted && onResolveConflict ? (
                  <MenuItem
                    icon={<IconFastMerge className="w-4 h-4" />}
                    label="Resolve conflict"
                    tone="warning"
                    onClick={() => run(() => onResolveConflict(file))}
                  />
                ) : null}
                <MenuItem
                  icon={<IconRevert className="w-4 h-4" />}
                  label="Discard local changes"
                  tone="danger"
                  onClick={() => run(() => onReset(file))}
                />
                <MenuItem
                  icon={<IconDelete className="w-4 h-4" />}
                  label="Delete file"
                  onClick={() => run(() => onRemove(file))}
                />
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  )
}

function MenuItem({
  icon,
  label,
  tone,
  onClick,
}: {
  icon: ReactNode
  label: string
  tone?: 'danger' | 'warning'
  onClick: () => void
}) {
  const toneCls =
    tone === 'danger'
      ? 'text-red-700 dark:text-red-300'
      : tone === 'warning'
        ? 'text-amber-700 dark:text-amber-300'
        : 'text-(--text-primary)'
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-(--surface-hover) ${toneCls}`}
    >
      {icon}
      {label}
    </button>
  )
}
