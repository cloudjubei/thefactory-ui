import { countPatchAddDel } from './gitUtils'

export type GitFileChangesPillsProps = {
  patch?: string
}

/**
 * Pair of `+N` / `-N` pills derived from a unified-diff patch — used in
 * StatusPanel rows and merge report listings.
 */
export function GitFileChangesPills({ patch }: GitFileChangesPillsProps) {
  if (!patch) return null
  const { add, del } = countPatchAddDel(patch)
  if (add === 0 && del === 0) return null

  return (
    <div className="flex items-center gap-1 shrink-0 text-[10px] font-mono leading-none">
      {add > 0 ? (
        <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20">
          +{add}
        </span>
      ) : null}
      {del > 0 ? (
        <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20">
          -{del}
        </span>
      ) : null}
    </div>
  )
}

export default GitFileChangesPills
