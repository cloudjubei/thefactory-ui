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

/**
 * The process-run fields that carry the feature↔run attribution AND the role of
 * each run.
 *
 * `ledger` links a run id to the step it ran; `plan` says what ROLE that step
 * was (developer, verifier), so the sign-off can show which agents ran each
 * section — not just the one run its verdict reflects.
 */
export type StorySignoffProcessRun = Pick<ProcessRun, 'id' | 'featureId' | 'ledger' | 'plan'>

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

/** An agent that ran a section — its role and the model it ran on. */
export type SignoffAgent = {
  /** The step's agent role: `developer`, `verifier`, … */
  role: string
  model: RunModel
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
  /** The agents that ran this feature — developer + verifier, newest per role. */
  agents: SignoffAgent[]
}

/**
 * The story-wide section shown FIRST — the whole-codebase checks (the full test
 * suite, UI tests, typecheck, build, lint/format, the diff) aggregated across
 * every feature, plus the end-to-end walkthrough. The per-feature sections carry
 * what proves each change; this carries what proves the story as a whole.
 */
export type OverallSignoff = {
  /** Story-wide capability chips (tests/uitests/types/lint/format/build/diff/walkthrough). */
  rows: CheckMethodRow[]
  /** The merged verification behind the Tests/Build panes. */
  verification: RunVerification | undefined
  /** True when no story-wide check failed — the "All green" line. */
  allGreen: boolean
  /** The verifier(s)/capture agent(s) that produced the story-wide checks. */
  agents: SignoffAgent[]
  /** Cost + duration of the story-scoped runs (the walkthrough capture, etc.). */
  facts: RunReviewFacts
}

/** How many features landed in each verdict — the one-glance pass/fail summary. */
export type StoryDigest = {
  total: number
  proven: number
  partly: number
  failed: number
  notRun: number
  /** The green strip's lead line, toned by the aggregate verdict. */
  headline: string
  /** The green strip's supporting line — what was verified, in one sentence. */
  line: string
}

/** The whole story's sign-off: an aggregate verdict, a digest, and the features. */
export type StorySignoff = {
  /** Features that produced a run, NEWEST FIRST. */
  features: FeatureSignoff[]
  /**
   * The story-wide section, shown first — present whenever any story-wide check
   * ran or a story-scoped walkthrough was filed.
   */
  overall: OverallSignoff | undefined
  /** The story headline — the worst feature verdict wins. */
  verdict: SignoffVerdict
  digest: StoryDigest
  /** Story-total cost + duration. */
  facts: RunReviewFacts
}
