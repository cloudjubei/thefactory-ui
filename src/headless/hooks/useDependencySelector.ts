import { useCallback, useMemo, useState } from 'react'

/**
 * Headless state machine for the "pick blockers" picker used by both
 * `FeatureForm` and `StoryForm`. Apps render their own list UI on top —
 * this hook owns the search query, the selected set, the filtering, and
 * the visibility predicate.
 *
 * No DOM, no context — pass the project's stories + their features in,
 * and the hook returns the filtered list with derived flags.
 */

export type FeatureLike = {
  id: string
  title: string
  description?: string
}

export type StoryLike = {
  id: string
  title: string
  description?: string
  features: ReadonlyArray<FeatureLike>
}

export type DependencySelectorOptions = {
  stories: ReadonlyArray<StoryLike>
  /** Self-references that should be greyed out (can't depend on self). */
  currentStoryId?: string
  currentFeatureId?: string
  /** Already-selected dependencies — checkboxes start checked, disabled. */
  existingDeps?: ReadonlyArray<string>
  /** Display index for a story id (`"3"`). Used in search match + display. */
  getStoryDisplayIndex?: (storyId: string) => string | number | undefined
  /** Display index for a feature id within a story (`"2"`). */
  getFeatureDisplayIndex?: (storyId: string, featureId: string) => string | number | undefined
  /** Optional ordering hint — defaults to the input order. */
  sortStories?: (a: StoryLike, b: StoryLike) => number
}

export type DependencyItem = {
  story: StoryLike
  storyDisplay: string
  storyDep: string
  storyDisabled: boolean
  storyMatches: boolean
  features: ReadonlyArray<{
    feature: FeatureLike
    featureDep: string
    featureDisplay: string
    disabled: boolean
  }>
}

export type UseDependencySelector = {
  search: string
  setSearch: (q: string) => void
  selected: ReadonlySet<string>
  /** All items that match the current query (story or any of its features). */
  items: ReadonlyArray<DependencyItem>
  toggle: (dep: string) => void
  clear: () => void
  canConfirm: boolean
  /** Return the currently-selected deps (in stable order). */
  collect: () => string[]
}

function defaultSortStories(
  getIdx: ((storyId: string) => string | number | undefined) | undefined,
) {
  if (!getIdx) return undefined
  return (a: StoryLike, b: StoryLike) => {
    const ai = Number(getIdx(a.id) ?? 0)
    const bi = Number(getIdx(b.id) ?? 0)
    return ai - bi
  }
}

export function useDependencySelector(opts: DependencySelectorOptions): UseDependencySelector {
  const {
    stories,
    currentStoryId,
    currentFeatureId,
    existingDeps = [],
    getStoryDisplayIndex,
    getFeatureDisplayIndex,
    sortStories,
  } = opts

  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(() => new Set(existingDeps))

  const ordered = useMemo(() => {
    const cmp = sortStories ?? defaultSortStories(getStoryDisplayIndex)
    return cmp ? [...stories].sort(cmp) : stories
  }, [stories, sortStories, getStoryDisplayIndex])

  const items = useMemo<DependencyItem[]>(() => {
    const q = search.trim().toLowerCase()
    const out: DependencyItem[] = []
    for (const story of ordered) {
      const storyDisplay = String(getStoryDisplayIndex?.(story.id) ?? story.id)
      const storyDep = story.id
      const storyHay = `${storyDisplay} ${story.title} ${story.description ?? ''}`.toLowerCase()
      const storyMatches = !q || storyHay.includes(q)

      const features = story.features.map((f) => {
        const featureDep = `${story.id}.${f.id}`
        const fIdx = String(getFeatureDisplayIndex?.(story.id, f.id) ?? f.id)
        const featureDisplay = `${storyDisplay}.${fIdx}`
        const featureHay = `${featureDisplay} ${f.title} ${f.description ?? ''}`.toLowerCase()
        const matches = !q || featureHay.includes(q)
        return matches
          ? {
              feature: f,
              featureDep,
              featureDisplay,
              disabled:
                (currentStoryId === story.id && currentFeatureId === f.id) ||
                existingDeps.includes(featureDep),
            }
          : null
      }).filter((x): x is NonNullable<typeof x> => x !== null)

      if (!storyMatches && features.length === 0) continue

      out.push({
        story,
        storyDisplay,
        storyDep,
        storyDisabled: existingDeps.includes(storyDep),
        storyMatches,
        features,
      })
    }
    return out
  }, [
    ordered,
    search,
    currentStoryId,
    currentFeatureId,
    existingDeps,
    getStoryDisplayIndex,
    getFeatureDisplayIndex,
  ])

  const toggle = useCallback((dep: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(dep)) next.delete(dep)
      else next.add(dep)
      return next
    })
  }, [])

  const clear = useCallback(() => setSelected(new Set()), [])

  const collect = useCallback(() => Array.from(selected), [selected])

  return {
    search,
    setSearch,
    selected,
    items,
    toggle,
    clear,
    canConfirm: selected.size > 0,
    collect,
  }
}
