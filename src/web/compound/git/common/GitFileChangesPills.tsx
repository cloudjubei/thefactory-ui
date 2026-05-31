import { countPatchAddDel } from 'thefactory-tools/utils'

export type GitFileChangesPillsProps = {
  /** When provided, the patch is parsed for `+`/`-` lines. */
  patch?: string
  /** Pre-computed additions — preferred for aggregate (multi-file) totals
   *  where there's no single patch to parse. Overrides `patch`. */
  additions?: number
  /** Pre-computed deletions — overrides `patch`. */
  deletions?: number
}

/**
 * Pair of `+N` / `-N` pills derived from either a unified-diff patch or
 * an explicit additions/deletions count. Used in StatusPanel rows, merge
 * report listings, and the commit-files header (where the aggregate
 * totals come from the diff summary).
 */
export function GitFileChangesPills({ patch, additions, deletions }: GitFileChangesPillsProps) {
  let add: number
  let del: number
  if (typeof additions === 'number' || typeof deletions === 'number') {
    add = additions ?? 0
    del = deletions ?? 0
  } else if (patch) {
    const counts = countPatchAddDel(patch)
    add = counts.add
    del = counts.del
  } else {
    return null
  }
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
