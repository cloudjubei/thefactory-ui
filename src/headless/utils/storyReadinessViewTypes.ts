import type { StoryReadinessProblem } from 'thefactory-tools/types'

/** A story's readiness badge: whether it is ready, and what it lacks. */
export interface StoryReadinessView {
  ready: boolean
  label: string
  tone: 'done' | 'on_hold'
  problems: (StoryReadinessProblem & { key: string })[]
}
