import type { ProcessRun } from 'thefactory-tools/types'

import type { CliRun, ReviewEvidenceRef, RunVerification } from '../api/generated'
import type { CheckMethodRow, SignoffVerdict } from './checkMethodTypes'
import type { VerifyReviewStatus } from './processView'
import type { RunModel } from './runModel'
import type { RunReviewFacts } from './runReviewTypes'
import type { VerifyAttemptSelection, VerifyAttemptStanding } from './verifyProofTypes'

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
 * The process-run fields that carry the feature↔run attribution, the role of
 * each run, and the pipeline's own time and cost.
 *
 * `ledger` links a run id to the step it ran; `plan` says what ROLE that step
 * was (developer, verifier) and which step a feature ran as, so the sign-off
 * can show which agents ran each section and read each feature's totals from
 * the same step the pipeline shows.
 */
export type StorySignoffProcessRun = Pick<ProcessRun, 'id' | 'featureId' | 'ledger' | 'plan'> &
  Partial<Pick<ProcessRun, 'parentRunId' | 'totals'>>

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
  /**
   * This feature's own headline verdict — the verify gate's outcome on its
   * accepted attempt when one ran, else what its checks came to.
   */
  verdict: SignoffVerdict
  /** The line beside the feature's title, in the same terms as its verdict. */
  statusLine: VerifyReviewStatus
  /** Where the accepted verify attempt stands; absent when no verify attempt ran. */
  standing: VerifyAttemptStanding | undefined
  /** This feature's time and cost: its step totals across every run of the story. */
  facts: RunReviewFacts
  /** Which agent/model produced this feature's run. */
  runModel: RunModel | undefined
  /** The agents that ran this feature — developer + verifier, newest per role. */
  agents: SignoffAgent[]
  /**
   * The verify attempt the feature was accepted on — its ledger entry carries the
   * gate's proof — and its other attempts. Absent when no run of it verified.
   */
  verify: VerifyAttemptSelection | undefined
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
  /** Time and cost of the story's own steps (the walkthrough capture, etc.) across every run. */
  facts: RunReviewFacts
}

/** How many features landed in each verdict — the one-glance pass/fail summary. */
export type StoryDigest = {
  total: number
  proven: number
  partly: number
  failed: number
  notRun: number
  /** Features a person accepted over the gate — counted within `partly`. */
  accepted: number
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
  /** Story-total time and cost — every root run of the story. */
  facts: RunReviewFacts
}
