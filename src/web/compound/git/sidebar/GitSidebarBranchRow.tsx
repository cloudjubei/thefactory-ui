import { IconArrowDown, IconArrowUp } from '../../../icons'
import type { GitUnifiedBranchLike } from '../types'

export type GitSidebarBranchRowProps = {
  branch: GitUnifiedBranchLike
  isSelected: boolean
  isRemoteSection?: boolean
  /** Extra left-padding levels (inside a folder). */
  indent?: number
  /**
   * Suppress the selected-row background highlight. Used on the narrow
   * master/detail layout where the row push-navigates to a detail screen —
   * no persistent "currently viewed" state to indicate on this list.
   */
  hideSelection?: boolean
  /**
   * Staged + unstaged file count for the current branch. Only rendered as
   * a warning-tinted chip on the current-branch row; ignored elsewhere.
   */
  dirtyCount?: number
  onClick?: () => void
  onDoubleClick?: () => void
}

export default function GitSidebarBranchRow({
  branch,
  isSelected,
  isRemoteSection,
  indent,
  hideSelection,
  dirtyCount,
  onClick,
  onDoubleClick,
}: GitSidebarBranchRowProps) {
  // Show only the part after the first "/" so grouped branches read well.
  const displayName = branch.name.includes('/')
    ? branch.name.split('/').slice(1).join('/')
    : branch.name

  const showSelected = isSelected && !hideSelection
  const rowCls =
    'group flex items-center gap-1.5 py-1.5 pr-2 rounded cursor-pointer text-xs ' +
    (showSelected ? 'bg-blue-50/80 dark:bg-blue-900/20' : 'hover:bg-(--surface-muted)')

  const pl = 8 + (indent ?? 0) * 8

  // Single-line layout: dot → name → all chips at the end (Local / Remote
  // / ahead-behind "Diff" indicators). Matches the mobile `BranchRow`'s
  // chips-at-end pattern across every viewport, so the row reads
  // consistently on every client.
  return (
    <div
      className={rowCls}
      style={{ paddingLeft: pl }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      <span className="w-2 h-2 shrink-0 flex items-center justify-center">
        {branch.current && !isRemoteSection ? (
          <span className="block w-1.5 h-1.5 rounded-full bg-green-500" />
        ) : null}
      </span>

      <span
        className={
          'truncate font-medium flex-1 min-w-0 ' +
          (branch.current && !isRemoteSection
            ? 'text-(--text-primary)'
            : 'text-(--text-secondary)')
        }
      >
        {displayName}
      </span>

      {/* Chip order: Diff (dirty count) → ahead (to push) → behind (to pull)
          → Local → Remote. Diff + ahead/behind come first so the user
          immediately spots actionable state on the current branch. Same
          order is mirrored in mobile's `BranchRow`. */}
      <span className="flex items-center gap-0.5 shrink-0">
        {!isRemoteSection && branch.current && (dirtyCount ?? 0) > 0 ? (
          <span className="px-1 py-0.5 text-[9px] leading-none rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold">
            {dirtyCount}
          </span>
        ) : null}
        {!isRemoteSection && branch.ahead ? (
          <span className="inline-flex items-center gap-0.5 text-[9px] leading-none font-semibold px-1 py-0.5 rounded bg-green-500/10 text-green-700 dark:text-green-400">
            <IconArrowUp className="w-2.5 h-2.5" />
            {branch.ahead}
          </span>
        ) : null}
        {!isRemoteSection && branch.behind ? (
          <span className="inline-flex items-center gap-0.5 text-[9px] leading-none font-semibold px-1 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-400">
            <IconArrowDown className="w-2.5 h-2.5" />
            {branch.behind}
          </span>
        ) : null}
        {!isRemoteSection && branch.isLocal && (
          <span className="px-1 py-0.5 text-[9px] leading-none rounded bg-(--surface-muted) text-(--text-muted) font-medium">
            L
          </span>
        )}
        {!isRemoteSection && branch.isRemote && (
          <span className="px-1 py-0.5 text-[9px] leading-none rounded bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 font-medium">
            R
          </span>
        )}
      </span>
    </div>
  )
}
