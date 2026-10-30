import type {
  LaunchFeaturePickCandidate,
  LaunchFeaturePickMetadata,
  LaunchFeaturePickRow,
} from './launchFeaturePickTypes'

/**
 * The features a launch works, in story order: the person's pick once they
 * made one; until then the features the agent named that are still open, or
 * every open feature. Pure.
 */
export function launchFeaturePicked(
  candidates: readonly LaunchFeaturePickCandidate[],
  named: readonly string[] | undefined,
  pick: readonly string[] | undefined,
): string[] {
  const ids = candidates.map((c) => c.id)
  if (pick) return ids.filter((id) => pick.includes(id))
  const asked = named ? ids.filter((id) => named.includes(id)) : []
  return asked.length > 0 ? asked : ids
}

/** The pick with one feature taken out or put back, in story order. Pure. */
export function toggleLaunchFeaturePick(
  candidates: readonly LaunchFeaturePickCandidate[],
  named: readonly string[] | undefined,
  pick: readonly string[] | undefined,
  featureId: string,
): string[] {
  const picked = launchFeaturePicked(candidates, named, pick)
  const next = picked.includes(featureId)
    ? picked.filter((id) => id !== featureId)
    : [...picked, featureId]
  return candidates.map((c) => c.id).filter((id) => next.includes(id))
}

/** Every open feature once, in story order, with whether the launch works it. Pure. */
export function launchFeaturePickRows(
  candidates: readonly LaunchFeaturePickCandidate[],
  picked: readonly string[],
): LaunchFeaturePickRow[] {
  return candidates.map((c) => ({ featureId: c.id, title: c.title, picked: picked.includes(c.id) }))
}

/** Whether there is a pick to make: more than one feature to choose from. Pure. */
export function launchFeaturePickOffered(
  candidates: readonly LaunchFeaturePickCandidate[],
): boolean {
  return candidates.length > 1
}

/**
 * The features the launch plan is read for: what the agent named while the pick
 * is still exactly that — the plan the card read before the story loaded, not
 * read again for the same features — else only the pick when it leaves some
 * out, the whole story when it takes every one, or none, which the card asks
 * to be fixed rather than previewed. Pure.
 */
export function launchFeaturePreviewIds(
  candidates: readonly LaunchFeaturePickCandidate[],
  picked: readonly string[],
  named?: readonly string[],
): string[] | undefined {
  if (named && named.length === picked.length && named.every((id) => picked.includes(id))) {
    return [...named]
  }
  if (picked.length === 0 || picked.length === candidates.length) return undefined
  return [...picked]
}

/** What the decision carries: the features picked, which replace those the agent named. Pure. */
export function launchFeaturePickMetadata(
  picked: readonly string[],
): LaunchFeaturePickMetadata | undefined {
  return picked.length > 0 ? { featureIds: [...picked] } : undefined
}
