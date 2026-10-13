/**
 * What the Processes tab and a story sign-off last read, kept for the life of
 * the app rather than of a view — so leaving the tab and coming back paints at
 * once from here while the hooks re-read in the background. Module-level and
 * account-global like `featureRequestsStore`; each hook writes what it reads.
 */

import type {
  ProcessIntegrationOptions,
  ProcessRun,
  ProcessRunSummary,
} from 'thefactory-tools/types'

import type { ProjectChecksListing } from '../api/generated'
import { BoundedCache } from '../utils/boundedCache'
import {
  ALL_PROJECTS_PROCESS_RUN_LIST_KEY,
  INTEGRATION_OPTIONS_CACHE_CAPACITY,
  PROCESS_RUN_CACHE_CAPACITY,
  PROCESS_RUN_LIST_CACHE_CAPACITY,
  PROJECT_CHECKS_CACHE_CAPACITY,
  REVIEW_EVIDENCE_CACHE_CAPACITY,
  STORY_SIGNOFF_CACHE_CAPACITY,
} from '../utils/processViewCacheConstants'
import type { ReviewEvidenceSnapshot, StorySignoffSources } from '../utils/processViewCacheTypes'

/** Root process-run lists, as the list route summarises them, by {@link processRunListKey}. */
export const processRunListCache = new BoundedCache<ProcessRunSummary[]>(
  PROCESS_RUN_LIST_CACHE_CAPACITY,
)

/** Single process runs, by run id. */
export const processRunCache = new BoundedCache<ProcessRun>(PROCESS_RUN_CACHE_CAPACITY)

/** A story sign-off's sources, by `projectId|storyId`. */
export const storySignoffSourceCache = new BoundedCache<StorySignoffSources>(
  STORY_SIGNOFF_CACHE_CAPACITY,
)

/** Evidence listings, by their query key. */
export const reviewEvidenceCache = new BoundedCache<ReviewEvidenceSnapshot>(
  REVIEW_EVIDENCE_CACHE_CAPACITY,
)

/** Project check scans, by project id. */
export const projectChecksCache = new BoundedCache<ProjectChecksListing>(
  PROJECT_CHECKS_CACHE_CAPACITY,
)

/** What approving a run's work offers, by run id — the sign-off reads it, the chooser shows it. */
export const integrationOptionsCache = new BoundedCache<ProcessIntegrationOptions>(
  INTEGRATION_OPTIONS_CACHE_CAPACITY,
)

/** The list key of a scope: one project's runs, or every project's. */
export function processRunListKey(projectId: string | undefined): string {
  return projectId ?? ALL_PROJECTS_PROCESS_RUN_LIST_KEY
}

/**
 * The last-read record of one run: its own read, else the copy a list held —
 * a run opened from the Processes list paints from the row it was opened from.
 * A list's copy is a {@link ProcessRunSummary}: what only the run's own view
 * opens (resolutions, change history, the manager's past interventions) arrives
 * with the run's own read.
 */
export function cachedProcessRun(runId: string | undefined): ProcessRun | undefined {
  if (!runId) return undefined
  const own = processRunCache.get(runId)
  if (own) return own
  for (const list of processRunListCache.values()) {
    const found = list.find((run) => run.id === runId)
    if (found) return found
  }
  return undefined
}

/** Forget everything — for a sign-out, and for tests. */
export function clearProcessViewCaches(): void {
  processRunListCache.clear()
  processRunCache.clear()
  storySignoffSourceCache.clear()
  reviewEvidenceCache.clear()
  projectChecksCache.clear()
  integrationOptionsCache.clear()
}
