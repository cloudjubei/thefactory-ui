// Selection bookkeeping for the working-tree "Local Changes" pane. When a
// stage / unstage / discard mutates the staged & unstaged file lists, the
// selection has to follow sensibly: SourceTree-style, fully staging the file
// you're on should advance to the NEXT file in the same area so you can keep
// working down the list, rather than snapping back to the top of the other
// section. Pure so it can be unit-tested and shared by web + desktop panes.

/** Which side of the working-tree split a row lives on. */
export type ChangesArea = 'staged' | 'unstaged'

/** Selection key — `${area}:${path}`. Built and compared verbatim so paths
 *  containing `:` stay opaque (never parsed apart). */
export type ChangesAreaKey = `${ChangesArea}:${string}`

/** Build the area-qualified selection key for a path. */
export function localChangesKey(area: ChangesArea, path: string): ChangesAreaKey {
  return `${area}:${path}`
}

/**
 * Compute the selection that should be active after the staged / unstaged
 * lists change.
 *
 * Resolution order:
 *  1. Keep any previously-selected rows whose path still exists in its area
 *     (a partial stage leaves the file in place → selection is unchanged; a
 *     multi-selection keeps its surviving rows).
 *  2. Otherwise, if the primary row left its area and that area still has
 *     files, single-select the file now at the same index (clamped) — the
 *     "advance to the next file" behaviour.
 *  3. Otherwise fall back to the first staged row, else the first unstaged
 *     row, else an empty selection.
 */
export function nextLocalChangesSelection(params: {
  /** Selection keys before the list update. */
  prevSelection: Set<ChangesAreaKey>
  /** The primary row before the update plus its index in its area's previous
   *  list — used to find the "next" file once it has gone. */
  prevPrimary: { area: ChangesArea; path: string; index: number } | null
  /** New staged paths, in document order. */
  staged: string[]
  /** New unstaged paths, in document order. */
  unstaged: string[]
}): Set<ChangesAreaKey> {
  const { prevSelection, prevPrimary, staged, unstaged } = params

  const validKeys = new Set<ChangesAreaKey>()
  for (const p of staged) validKeys.add(localChangesKey('staged', p))
  for (const p of unstaged) validKeys.add(localChangesKey('unstaged', p))

  const survivors = new Set<ChangesAreaKey>([...prevSelection].filter((k) => validKeys.has(k)))
  if (survivors.size > 0) return survivors

  if (prevPrimary) {
    const list = prevPrimary.area === 'staged' ? staged : unstaged
    const stillPresent = list.includes(prevPrimary.path)
    if (!stillPresent && list.length > 0) {
      const idx = Math.min(prevPrimary.index, list.length - 1)
      return new Set<ChangesAreaKey>([localChangesKey(prevPrimary.area, list[idx])])
    }
  }

  if (staged[0]) return new Set<ChangesAreaKey>([localChangesKey('staged', staged[0])])
  if (unstaged[0]) return new Set<ChangesAreaKey>([localChangesKey('unstaged', unstaged[0])])
  return new Set<ChangesAreaKey>()
}

/**
 * Keys for the contiguous range of rows between two paths in one area's
 * ordered list (inclusive, order-independent) — the shift-click range-select.
 * Returns an empty set when either endpoint is absent so the caller can fall
 * back to a single selection.
 */
export function localChangesRangeKeys(
  area: ChangesArea,
  fromPath: string,
  toPath: string,
  orderedPaths: string[],
): Set<ChangesAreaKey> {
  const i1 = orderedPaths.indexOf(fromPath)
  const i2 = orderedPaths.indexOf(toPath)
  if (i1 < 0 || i2 < 0) return new Set<ChangesAreaKey>()
  const lo = Math.min(i1, i2)
  const hi = Math.max(i1, i2)
  const keys = new Set<ChangesAreaKey>()
  for (let i = lo; i <= hi; i++) keys.add(localChangesKey(area, orderedPaths[i]))
  return keys
}
