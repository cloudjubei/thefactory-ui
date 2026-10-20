/** The tool whose launch the card asks about. */
export const EVALUATE_KNOWLEDGE_TOOL = 'evaluateKnowledge'

/** The kind of detail the host attaches to the ask. */
export const EVALUATION_LAUNCH_DETAIL_KIND = 'knowledge-evaluation-launch'

/** Where a resolved setting came from, in short words. */
export const EVALUATION_LAUNCH_SOURCE: Record<string, string> = {
  explicit: 'in the call',
  matched: 'matched run',
  'project-defaults': 'project default',
  'tab-defaults': 'tab default',
  'host-default': 'host default',
}

/** The card's header, body and button copy. */
export const EVALUATION_LAUNCH_ASK = {
  ask: 'The agent wants to run a knowledge evaluation',
  tag: 'Evaluation',
  headline: (stage: string, agentRuns?: string) =>
    agentRuns ? `${stage} evaluation · ${agentRuns}` : `${stage} evaluation`,
  fallbackStage: 'Knowledge',
  agentRuns: (n: string, one: boolean) => `${n} agent ${one ? 'run' : 'runs'}`,
  scenarios: (n: string, one: boolean) => `${n} ${one ? 'scenario' : 'scenarios'}`,
  consequence: (model?: string) =>
    model ? `Every agent run spends model time on ${model}.` : 'Every agent run spends model time.',
  coveredConsequence: 'It re-reads the scorecard and spends no model time.',
  verb: 'Run evaluation',
  settings: 'Settings',
  matched: 'Matches run',
  ledger: {
    resume: 'Resumes the ledger',
    fresh: 'Starts a fresh ledger',
    replace: 'Replaces the ledger',
    reset: 'Resets the ledger',
    keepsCopy: ' — keeps a copy first',
  },
  covered: 'Already covered — runs nothing',
  coveredShort: 'already covered',
  work: 'Work',
  mixedTitle: 'Mixed builds',
  mixedDetail: (builds: string) =>
    `The ledger already holds runs from ${builds}. Their scores would mix with this build’s.`,
  unstamped: (n: number) => `${n} ${n === 1 ? 'run' : 'runs'} with no build recorded`,
  otherBuilds: 'other builds',
  unavailable: (targets: string) =>
    `Not on this machine: ${targets} — their scenarios are dropped.`,
  unknownFocus: (names: string) => `Not in the battery: ${names}`,
  build: 'Build',
  measured: 'Measures',
  thisBuild: 'This build',
  uncommitted: 'uncommitted changes',
  previewError: (error: string) => `Preview incomplete: ${error}`,
  previewUnavailable: (error?: string) =>
    error ? `Preview unavailable: ${error}` : 'Preview unavailable',
  on: 'On',
  resetValue: 'Start over',
  withoutRawSource: 'Left out',
  compared: 'Compared',
} as const

/** How many characters of a commit the card shows. */
export const EVALUATION_LAUNCH_SHORT_SHA = 7
