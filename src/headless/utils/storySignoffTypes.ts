import type { ProcessRun } from 'thefactory-tools/types'

import type { CliRun, ReviewEvidenceRef, RunVerification } from '../api/generated'
import type { CheckMethodRow, ReviewTabId, SignoffVerdict } from './checkMethodTypes'
import type { CliRunCostSource } from './costDetailsTypes'
import type { VerifyReviewStatus } from './processView'
import type { EvidenceTile, ScreenPair } from './reviewEvidenceViewTypes'
import type { RunModel } from './runModel'
import type { RunReviewFacts } from './runReviewTypes'
import type {
  EvidenceLoadState,
  FeatureVerifySectionProps,
  VerifyAttempt,
  VerifyAttemptStanding,
  VerifyVerdictNote,
} from './verifyProofTypes'

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
  | 'durationMs'
  | 'cli'
  | 'modelId'
  | 'effort'
> &
  CliRunCostSource

/**
 * The process-run fields that carry the feature↔run attribution, the role of
 * each run, and the pipeline's own time and cost.
 *
 * `ledger` links a run id to the step it ran; `plan` says what ROLE that step
 * was (developer, verifier) and which step a feature ran as, so the sign-off
 * can show which agents ran each section and read each feature's totals from
 * the same step the pipeline shows.
 */
export type StorySignoffProcessRun = Pick<
  ProcessRun,
  'id' | 'featureId' | 'ledger' | 'plan' | 'startedAt'
> &
  Partial<Pick<ProcessRun, 'parentRunId' | 'totals'>>

export type BuildStorySignoffInput = {
  /** The story's features, in declaration order. */
  features: readonly StoryFeatureRef[]
  /** Every process run for the story (root + per-feature children), every relaunch included. */
  processRuns: readonly StorySignoffProcessRun[]
  /**
   * The story run being signed off. Each feature is read from its run under
   * this one — a relaunch's run, not the attempts of every run before it — and
   * the Overall from this run's own steps. Absent, the newest root stands in.
   */
  storyRunId?: string
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

/**
 * The process runs a sign-off reads: the story run being signed off, and the
 * latest run of each feature. Every other run of the story is history.
 */
export type SignoffScope = {
  storyRun: StorySignoffProcessRun | undefined
  /** Each feature's latest run, by feature id. */
  featureRuns: Map<string, StorySignoffProcessRun>
  /** The ids of the story run and every feature's latest run. */
  processRunIds: Set<string>
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
  /** This feature's time and cost: its latest run's totals alone. */
  facts: RunReviewFacts
  /** Which agent/model produced this feature's run. */
  runModel: RunModel | undefined
  /** The agents that ran this feature — developer + verifier, newest per role. */
  agents: SignoffAgent[]
  /**
   * The verify attempt the feature's latest run was accepted on — its ledger
   * entry carries the gate's proof. Absent when that run has not verified.
   */
  verify: VerifyAttempt | undefined
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
  /** What the story-wide checks came to — failed, all green, or nothing checked. */
  statusLine: VerifyReviewStatus
  /**
   * How each of the story run's own steps (the walkthrough, the code review, the
   * final report) ended, with the reason it gave — a skipped walkthrough files
   * nothing, so this is the one place its reason is read. A finished code review
   * that filed a finding is said by its verdict instead.
   */
  notes: VerifyVerdictNote[]
  /** The verifier(s)/capture agent(s) that produced the story-wide checks. */
  agents: SignoffAgent[]
  /** Time and cost of the story run's own steps (the walkthrough capture, etc.). */
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
  /** Proven features over those shown, beside the verdict word; absent before any feature ran. */
  tally: SignoffTally | undefined
}

/** The verdict badge's count — `2/2` — and the sentence it abbreviates. */
export type SignoffTally = { label: string; title: string }

/** The verdict's own line under the badge, for an outcome the tally alone does not explain. */
export type SignoffHeadline = Pick<SignoffVerdict, 'title' | 'detail'>

/** The whole story's sign-off: an aggregate verdict, a digest, and the features. */
export type StorySignoff = {
  /** Features that produced a run, NEWEST FIRST. */
  features: FeatureSignoff[]
  /**
   * The story-wide section, shown first — always there for a story run, and
   * without one whenever any story-wide check ran or a story-wide filing was made.
   */
  overall: OverallSignoff | undefined
  /** The story headline — the worst feature verdict wins. */
  verdict: SignoffVerdict
  /**
   * The verdict's title and detail, only when the outcome is not a clean
   * all-proven one: "All 2 features proven" beside "Proven · 2/2" says nothing new.
   */
  headline: SignoffHeadline | undefined
  digest: StoryDigest
  /** Story-total time and cost — each feature's latest run and the story run's own steps. */
  facts: RunReviewFacts
  /**
   * The runs whose filings the sign-off shows — each feature's latest run and
   * the story run's own. Undefined when no process run scopes the story, so
   * everything filed for it shows.
   */
  evidenceRunIds: ReadonlySet<string> | undefined
}

/** Where one of the sources a sign-off is computed from stands. */
export type SignoffSourceState = EvidenceLoadState

/** The sources a sign-off is computed from: the story's runs, its feature list and its filings. */
export type SignoffSources = {
  runs: SignoffSourceState
  stories: SignoffSourceState
  evidence: SignoffSourceState
}

/** Whether a sign-off can be shown yet — never while any of what it is computed from is still loading. */
export type SignoffLoadStatus = 'loading' | 'failed' | 'ready'

/**
 * What one sign-off section shows of the filings in scope, each routed by who
 * filed it — the story-wide Overall under `''`, a feature under its id.
 */
export type SignoffSection = {
  pairs: ScreenPair[]
  recordings: EvidenceTile[]
  /**
   * The Report tab: the section's own report step's account first — the story's
   * final report, or the feature's report — then the verifier's newest.
   */
  reports: EvidenceTile[]
  /** The Code review tab: the newest code review filed for the section, alone. */
  codeReviews: EvidenceTile[]
  /**
   * A feature's code review verdict, in the reviewer-verdict style. Empty on the
   * Overall, whose code review is said among its step notes.
   */
  notes: VerifyVerdictNote[]
  /** The tab the section opens on — the Report tab, when it holds the story's final report. */
  leadTab: ReviewTabId | undefined
}

/**
 * What a sign-off section is handed: what it filed, and — for a feature with a
 * verify attempt — that attempt's proof, its notes and which attempt it is.
 */
export type SignoffSectionProps = Pick<
  SignoffSection,
  'pairs' | 'recordings' | 'reports' | 'codeReviews' | 'notes'
> &
  Partial<
    Pick<FeatureVerifySectionProps, 'uncountedRecordings' | 'emptyLabel' | 'proof' | 'attemptLabel'>
  > & {
    leadTab?: ReviewTabId
  }
