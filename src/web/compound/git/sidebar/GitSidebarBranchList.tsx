import type { GitUnifiedBranchLike } from '../types'
import GitSidebarBranchFolder from './GitSidebarBranchFolder'
import GitSidebarBranchRow from './GitSidebarBranchRow'

export type GitSidebarBranchListProps = {
  branches: GitUnifiedBranchLike[]
  isRemoteSection?: boolean
  selectedBranchName?: string
  selectedStashRef?: string
  /** Suppress per-row selected-background highlight. Forwarded to each row. */
  hideSelection?: boolean
  /** Dirty file count for the current branch — rendered on its row only. */
  dirtyCount?: number
  /**
   * Persisted folder open state. Folders not in the map default to open
   * (matches the sidebar's "first time" UX); explicit `false` keeps a
   * folder collapsed after the user toggled it.
   *
   * Keys are scoped via `folderKeyPrefix` so a folder named `feature` in
   * Branches and one in Remotes maintain independent open state.
   */
  folderOpenMap?: Record<string, boolean>
  folderKeyPrefix?: string
  /** Callback to mutate the persisted map for a single folder. */
  onFolderToggle?: (folder: string) => (open: boolean) => void
  onSelectBranch: (b: GitUnifiedBranchLike) => void
  onDoubleClickBranch?: (b: GitUnifiedBranchLike) => void
}

function groupBranches(branches: GitUnifiedBranchLike[]) {
  const groups: Record<string, GitUnifiedBranchLike[]> = {}
  const root: GitUnifiedBranchLike[] = []
  for (const b of branches) {
    const slash = b.name.indexOf('/')
    if (slash > 0) {
      const g = b.name.slice(0, slash)
      if (!groups[g]) groups[g] = []
      groups[g].push(b)
    } else {
      root.push(b)
    }
  }
  return { groups, root }
}

export default function GitSidebarBranchList({
  branches,
  isRemoteSection,
  selectedBranchName,
  selectedStashRef,
  hideSelection,
  dirtyCount,
  folderOpenMap,
  folderKeyPrefix,
  onFolderToggle,
  onSelectBranch,
  onDoubleClickBranch,
}: GitSidebarBranchListProps) {
  const scopedKey = (groupName: string) =>
    folderKeyPrefix ? `${folderKeyPrefix}:${groupName}` : groupName
  const { root, groups } = groupBranches(branches)
  const sortedGroupNames = Object.keys(groups).sort((a, b) => a.localeCompare(b))

  return (
    <div className="flex flex-col gap-0.5">
      {root.map((b) => (
        <GitSidebarBranchRow
          key={b.name}
          branch={b}
          isSelected={selectedBranchName === b.name && !selectedStashRef}
          isRemoteSection={isRemoteSection}
          hideSelection={hideSelection}
          dirtyCount={dirtyCount}
          onClick={() => onSelectBranch(b)}
          onDoubleClick={() => onDoubleClickBranch?.(b)}
        />
      ))}
      {sortedGroupNames.map((g) => {
        const key = scopedKey(g)
        // Folder is open when explicitly true, or when not yet toggled (no
        // entry in the map). Explicit `false` keeps a previously-collapsed
        // folder collapsed across sessions.
        const storedOpen = folderOpenMap ? folderOpenMap[key] : undefined
        const open = storedOpen !== false
        return (
          <GitSidebarBranchFolder
            key={key}
            groupName={g}
            branches={groups[g]}
            isRemoteSection={isRemoteSection}
            selectedBranchName={selectedBranchName}
            selectedStashRef={selectedStashRef}
            hideSelection={hideSelection}
            dirtyCount={dirtyCount}
            open={open}
            onToggle={onFolderToggle?.(key)}
            onSelectBranch={onSelectBranch}
            onDoubleClickBranch={onDoubleClickBranch}
          />
        )
      })}
    </div>
  )
}
