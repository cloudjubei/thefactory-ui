import { useEffect, useState } from 'react'
import { IconChevronDown, IconFolder, IconFolderOpen } from '../../../icons'
import type { GitUnifiedBranchLike } from '../types'
import GitSidebarBranchRow from './GitSidebarBranchRow'

export type GitSidebarBranchFolderProps = {
  groupName: string
  branches: GitUnifiedBranchLike[]
  isRemoteSection?: boolean
  selectedBranchName?: string
  selectedStashRef?: string
  /** Forwarded to each child branch row. */
  hideSelection?: boolean
  /** Dirty count, surfaced only on the current-branch row. */
  dirtyCount?: number
  /**
   * Controlled open state. When omitted, the folder manages its own state
   * (default: open) — matches the original uncontrolled API for callers
   * that don't need persistence.
   */
  open?: boolean
  onToggle?: (open: boolean) => void
  onSelectBranch: (b: GitUnifiedBranchLike) => void
  onDoubleClickBranch?: (b: GitUnifiedBranchLike) => void
}

export default function GitSidebarBranchFolder({
  groupName,
  branches,
  isRemoteSection,
  selectedBranchName,
  selectedStashRef,
  hideSelection,
  dirtyCount,
  open: openProp,
  onToggle,
  onSelectBranch,
  onDoubleClickBranch,
}: GitSidebarBranchFolderProps) {
  const hasSelected = branches.some((b) => b.name === selectedBranchName && !selectedStashRef)
  const [internalOpen, setInternalOpen] = useState(true)
  const isControlled = openProp !== undefined
  const open = isControlled ? openProp : internalOpen

  // Auto-expand when a child becomes selected — keeps the folder out of the
  // way until a user navigates inside it. The controlled-mode equivalent
  // calls back so the parent's persisted map can update.
  useEffect(() => {
    if (!hasSelected) return
    if (isControlled) {
      if (!openProp && onToggle) onToggle(true)
    } else {
      setInternalOpen(true)
    }
  }, [hasSelected, isControlled, openProp, onToggle])

  const toggle = () => {
    const next = !open
    if (isControlled) onToggle?.(next)
    else setInternalOpen(next)
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center gap-1 py-1 pl-3 pr-2 text-left hover:bg-(--surface-muted) rounded transition-colors"
      >
        <IconChevronDown
          className={`shrink-0 w-3 h-3 transition-transform text-(--text-muted) ${open ? '' : '-rotate-90'}`}
        />
        <span className="w-3.5 h-3.5 flex items-center justify-center text-(--text-muted)">
          {open ? <IconFolderOpen className="w-3 h-3" /> : <IconFolder className="w-3 h-3" />}
        </span>
        <span className="text-[11px] font-medium text-(--text-secondary)">{groupName}</span>
      </button>

      {open && (
        <div className="mt-0.5 flex flex-col">
          {branches.map((b) => (
            <GitSidebarBranchRow
              key={b.name}
              branch={b}
              isSelected={b.name === selectedBranchName && !selectedStashRef}
              isRemoteSection={isRemoteSection}
              hideSelection={hideSelection}
              dirtyCount={dirtyCount}
              indent={1}
              onClick={() => onSelectBranch(b)}
              onDoubleClick={() => onDoubleClickBranch?.(b)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
