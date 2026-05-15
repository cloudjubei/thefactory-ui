import type { GitStashListItemLike } from '../types'

export type GitSidebarStashRowProps = {
  stash: GitStashListItemLike
  isSelected: boolean
  onClick: () => void
}

export default function GitSidebarStashRow({
  stash,
  isSelected,
  onClick,
}: GitSidebarStashRowProps) {
  return (
    <div
      className={
        'flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer text-xs ' +
        (isSelected ? 'bg-blue-50/80 dark:bg-blue-900/20' : 'hover:bg-(--surface-muted)')
      }
      onClick={onClick}
    >
      <span className="truncate text-(--text-secondary) font-medium">{stash.message}</span>
    </div>
  )
}
