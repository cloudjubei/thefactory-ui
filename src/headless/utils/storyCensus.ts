import type { Feature } from '../api/generated'

/**
 * How much of a story is actually finished.
 *
 * PAIRED with `censusFeatures` in thefactory-tools (`src/story/storyCensus.ts`),
 * which enforces the same rule server-side when approving. This copy exists
 * because that package's barrel reaches for Node APIs and cannot be imported
 * into a browser or React Native bundle. The two must agree on `complete`;
 * change one and change the other.
 */
export type StoryFeatureCensus = {
  total: number
  done: number
  pending: number
  inProgress: number
  blocked: number
  deferred: number
  /** Features still standing between this story and completion. Deferred is deliberate, so it does not count. */
  outstanding: number
  complete: boolean
  /** Header line — "3 of 5 features done". */
  label: string
}

/** Pre-words status symbols still present in older stories. */
const LEGACY_STATUS: Readonly<Record<string, string>> = {
  '-': 'pending',
  '~': 'in_progress',
  '+': 'done',
  '?': 'blocked',
  '=': 'deferred',
}

export function censusFeatures(features: readonly Feature[]): StoryFeatureCensus {
  const counts = { pending: 0, in_progress: 0, done: 0, blocked: 0, deferred: 0 }
  let unrecognised = 0
  for (const feature of features) {
    const raw = String(feature.status)
    const status = LEGACY_STATUS[raw] ?? raw
    if (status in counts) counts[status as keyof typeof counts] += 1
    else unrecognised += 1
  }
  const total = features.length
  // A status we cannot read is NOT a finished one. Skipping it would drop it out
  // of the count entirely and let a story with a corrupt status read as complete.
  const outstanding = counts.pending + counts.in_progress + counts.blocked + unrecognised
  // "0 of 0" is not an accomplishment: a story with no features has finished
  // nothing, and reading it as complete would open sign-off on an empty plan.
  const complete = total > 0 && outstanding === 0
  const deferredNote = counts.deferred > 0 ? `, ${counts.deferred} deferred` : ''
  return {
    total,
    done: counts.done,
    pending: counts.pending,
    inProgress: counts.in_progress,
    blocked: counts.blocked,
    deferred: counts.deferred,
    outstanding,
    complete,
    label:
      total === 0
        ? 'No features on this story'
        : `${counts.done} of ${total} feature${total === 1 ? '' : 's'} done${deferredNote}`,
  }
}

/**
 * Why sign-off is not offered yet, or `undefined` when the story is finished.
 * Named reasons rather than a bare disabled button: "2 features are still
 * unfinished" tells the reader what to do next.
 */
export function incompleteStoryReason(census: StoryFeatureCensus): string | undefined {
  if (census.complete) return undefined
  if (census.total === 0) return 'This story has no features, so there is nothing to sign off.'
  const parts: string[] = []
  if (census.pending > 0) parts.push(`${census.pending} not started`)
  if (census.inProgress > 0) parts.push(`${census.inProgress} still in progress`)
  if (census.blocked > 0) parts.push(`${census.blocked} blocked`)
  return `${census.outstanding} of ${census.total} features are unfinished (${parts.join(', ')}).`
}
