import { useEffect, useMemo, useRef, useState } from 'react'
import {
  localChangesKey,
  localChangesRangeKeys,
  nextLocalChangesSelection,
  type ChangesArea,
  type ChangesAreaKey,
} from '../utils/localChangesSelection'

export type LocalChangesPrimary = { area: ChangesArea; path: string }

export interface UseLocalChangesSelection {
  /** First selected row in document order (staged before unstaged) — drives
   *  the diff pane. */
  primary: LocalChangesPrimary | null
  isSelected: (area: ChangesArea, path: string) => boolean
  /** Selected paths in `area`, returned in the supplied document order. */
  selectedPathsIn: (area: ChangesArea, orderedPaths: string[]) => string[]
  /** Plain click — replace the selection with this row. */
  selectSingle: (area: ChangesArea, path: string) => void
  /** Cmd/Ctrl click — add or remove this row. */
  toggleOne: (area: ChangesArea, path: string) => void
  /** Shift click — extend from the anchor; single-selects if the anchor is in
   *  another area or has gone. */
  selectRange: (area: ChangesArea, path: string) => void
}

/**
 * Selection model for the working-tree "Local Changes" pane, shared by the web
 * and desktop panes. Owns the multi-select set, the shift-click anchor, and the
 * advance-to-the-next-file bookkeeping after a full stage/unstage
 * (`nextLocalChangesSelection`). Hosts map their row gestures to
 * `selectSingle` / `toggleOne` / `selectRange` and keep their own DOM /
 * narrow-viewport concerns.
 *
 * `stagedPaths` / `unstagedPaths` must be referentially stable across renders
 * (memoise them) — the advance effect keys on them.
 */
export function useLocalChangesSelection(
  stagedPaths: string[],
  unstagedPaths: string[],
): UseLocalChangesSelection {
  const [selection, setSelection] = useState<Set<ChangesAreaKey>>(new Set())
  const anchorRef = useRef<LocalChangesPrimary | null>(null)
  const prevPathsRef = useRef<{ staged: string[]; unstaged: string[] }>({
    staged: [],
    unstaged: [],
  })

  useEffect(() => {
    const { staged: oldStaged, unstaged: oldUnstaged } = prevPathsRef.current
    setSelection((prev) => {
      let prevPrimary: { area: ChangesArea; path: string; index: number } | null = null
      const si = oldStaged.findIndex((p) => prev.has(localChangesKey('staged', p)))
      if (si >= 0) prevPrimary = { area: 'staged', path: oldStaged[si], index: si }
      else {
        const ui = oldUnstaged.findIndex((p) => prev.has(localChangesKey('unstaged', p)))
        if (ui >= 0) prevPrimary = { area: 'unstaged', path: oldUnstaged[ui], index: ui }
      }
      const next = nextLocalChangesSelection({
        prevSelection: prev,
        prevPrimary,
        staged: stagedPaths,
        unstaged: unstagedPaths,
      })
      // When the selection settles to a single row (e.g. an auto-advance), move
      // the shift anchor onto it so a following range-select extends from there
      // rather than a file that has left its area.
      if (next.size === 1) {
        const sp = stagedPaths.find((p) => next.has(localChangesKey('staged', p)))
        if (sp) anchorRef.current = { area: 'staged', path: sp }
        else {
          const up = unstagedPaths.find((p) => next.has(localChangesKey('unstaged', p)))
          if (up) anchorRef.current = { area: 'unstaged', path: up }
        }
      }
      return next
    })
    prevPathsRef.current = { staged: stagedPaths, unstaged: unstagedPaths }
  }, [stagedPaths, unstagedPaths])

  const primary = useMemo<LocalChangesPrimary | null>(() => {
    for (const p of stagedPaths)
      if (selection.has(localChangesKey('staged', p))) return { area: 'staged', path: p }
    for (const p of unstagedPaths)
      if (selection.has(localChangesKey('unstaged', p))) return { area: 'unstaged', path: p }
    return null
  }, [stagedPaths, unstagedPaths, selection])

  const isSelected = (area: ChangesArea, path: string) => selection.has(localChangesKey(area, path))

  const selectedPathsIn = (area: ChangesArea, orderedPaths: string[]) =>
    orderedPaths.filter((p) => selection.has(localChangesKey(area, p)))

  const selectSingle = (area: ChangesArea, path: string) => {
    setSelection(new Set([localChangesKey(area, path)]))
    anchorRef.current = { area, path }
  }

  const toggleOne = (area: ChangesArea, path: string) => {
    const key = localChangesKey(area, path)
    setSelection((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
    anchorRef.current = { area, path }
  }

  const selectRange = (area: ChangesArea, path: string) => {
    const anchor = anchorRef.current
    if (anchor && anchor.area === area) {
      const ordered = area === 'staged' ? stagedPaths : unstagedPaths
      const range = localChangesRangeKeys(area, anchor.path, path, ordered)
      if (range.size > 0) {
        setSelection((prev) => new Set([...prev, ...range]))
        return
      }
    }
    selectSingle(area, path)
  }

  return { primary, isSelected, selectedPathsIn, selectSingle, toggleOne, selectRange }
}
