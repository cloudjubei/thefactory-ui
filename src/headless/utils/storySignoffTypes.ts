import type { CliRun, ProcessRun, ReviewEvidenceRef, RunVerification } from '../api/generated'
import type { CheckMethodRow, SignoffVerdict } from './checkMethodTypes'
import type { RunModel } from './runModel'
import type { RunReviewFacts } from './runReviewTypes'

/** A story's feature, reduced to what the sign-off needs from it. */
export type StoryFeatureRef = { id: string; title: string }

/**
 * The run fields the story sign-off reads.
 *
 * A `Pick` rather than the whole `CliRun` so a test fixture is a handful of
 * fields, and so the pure builder cannot reach for anything the two list
 * endpoints do not already return.
 */
export type StorySignoffRun = Pick<
  CliRun,
  | 'id'
  | 'processRunId'
  | 'createdAt'
  | 'verification'
  | 'verdict'
  | 'diffReview'
  | 'costUSD'
  | 'durationMs'
  | 'cli'
  | 'modelId'
  | 'effort'
>

/** The process-run fields that carry the feature↔run attribution. */
export type StorySignoffProcessRun = Pick<ProcessRun, 'id' | 'featureId' | 'ledger'>

export type BuildStorySignoffInput = {
  /** The story's features, in declaration order. */
  features: readonly StoryFeatureRef[]
  /** Every process run for the story (root + per-feature children). */
  processRuns: readonly StorySignoffProcessRun[]
  /** Every CLI run for the story. */
  cliRuns: readonly StorySignoffRun[]
  /** All filed evidence for the story, attributed per feature by `featureId`. */
  evidence: readonly ReviewEvidenceRef[]
  /**
   * Why the STORY is not finished, when it is not — folds into the aggregate
   * headline exactly as it does for a single run, so "proven" can never sit above
   * a list of unfinished features.
   */
  storyIncomplete?: string
}

/** One feature's contribution to the story sign-off. */
export type FeatureSignoff = {
  featureId: string
  title: string
  /** The run whose verification/verdict this section reflects, if one landed. */
  runId: string | undefined
  /** True when a verification record exists for the chosen run. */
  verified: boolean
  /** The chosen run's verification record — for the Tests/Build panes. */
  verification: RunVerification | undefined
  /** The "what was checked" chips for this feature. */
  rows: CheckMethodRow[]
  /** This feature's own headline verdict. */
  verdict: SignoffVerdict
  /** This feature's cost + duration labels. */
  facts: RunReviewFacts
  /** Which agent/model produced this feature's run. */
  runModel: RunModel | undefined
}

/** How many features landed in each verdict — the one-glance pass/fail summary. */
export type StoryDigest = {
  total: number
  proven: number
  partly: number
  failed: number
  notRun: number
}

/** The whole story's sign-off: an aggregate verdict, a digest, and the features. */
export type StorySignoff = {
  /** Features that produced a run, NEWEST FIRST. */
  features: FeatureSignoff[]
  /** The story headline — the worst feature verdict wins. */
  verdict: SignoffVerdict
  digest: StoryDigest
  /** Story-total cost + duration. */
  facts: RunReviewFacts
}
