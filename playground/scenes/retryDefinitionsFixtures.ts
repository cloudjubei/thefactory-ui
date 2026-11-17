import type { ProcessRetryDefinitionsOffer } from 'thefactory-ui/headless'

const reviewer = (version: number) => ({
  kind: 'agent-type' as const,
  id: 'reviewer',
  name: 'Reviewer',
  version,
})

const feature = (version: number) => ({
  kind: 'process' as const,
  id: 'feature-default',
  name: 'Feature',
  version,
})

/**
 * What each settled screen shows.
 *
 * `this-run` — heading "What it runs", then "Reviewer, version 4 · Feature, version 2".
 * No second choice: those are the versions the retry runs.
 *
 * `newer` — "This run's" selected. Both lines are on screen:
 * "This run's: Reviewer, version 4 · Feature, version 2" and
 * "Current: Reviewer, version 7 · Feature, version 2". Trying again runs version 4.
 *
 * `current` — "Current" selected, same two lines, the current one emphasized.
 * Trying again runs Reviewer version 7 and Feature version 2.
 */
export const RETRY_DEFINITIONS_SAME: ProcessRetryDefinitionsOffer = {
  frozen: [reviewer(4), feature(2)],
}

export const RETRY_DEFINITIONS_NEWER: ProcessRetryDefinitionsOffer = {
  frozen: [reviewer(4), feature(2)],
  current: [reviewer(7), feature(2)],
}
