import type { LaunchCapKey } from './processLaunchCapsTypes'

/** What a launch's limits are called, and what each one holds to. */
export const LAUNCH_CAP_LABELS: Record<
  LaunchCapKey,
  { label: string; unit: string; hint: string }
> = {
  spendCapUsd: { label: 'Spend limit', unit: '$', hint: 'For the whole run.' },
  wallClockMs: { label: 'Time limit', unit: 'minutes', hint: 'From launch to the end.' },
  maxIterations: {
    label: 'Attempts',
    unit: 'per step',
    hint: 'The most times a step can be sent back and run again.',
  },
  questionCap: {
    label: 'Questions',
    unit: 'for the run',
    hint: 'How many the agents may ask you. 0 asks none.',
  },
  checkTimeoutMs: { label: 'Check timeout', unit: 'minutes', hint: 'For each check command.' },
}

/** The limits' words. */
export const LAUNCH_CAPS_COPY = {
  heading: 'Limits',
  noLimits: 'No limits',
  noQuestions: 'No questions',
  fromProject: 'Project default',
  projectDefault: (text: string) => `Project default: ${text}`,
  agentAsked: (text: string) => `Agent asked: ${text}`,
  legsDefault: 'Left empty, each project’s default applies.',
  eachPart: 'Each limit holds for each part. Left empty, its project’s default applies.',
  invalidAmount: 'Enter an amount above 0.',
  invalidWhole: 'Enter a whole number above 0.',
  invalidCount: 'Enter 0 or a whole number.',
  invalidMinutes: 'Enter a number of minutes above 0.',
  worstCase: (attempts: string, things: string, total: string) =>
    `Worst case: ${attempts} × ${things} = ${total}`,
  projectHeading: 'Default run limits',
  projectHint: 'Each launch starts from these, and can change them.',
  defaultBlocked: (label: string, error: string) => `${label}: ${error}`,
} as const

/** The number of milliseconds a field's minute stands for. */
export const LAUNCH_CAP_MINUTE_MS = 60_000

/** What a run's worst case counts its attempts across. */
export const LAUNCH_WORST_CASE_THINGS = {
  feature: 'feature',
  leg: 'project',
  variant: 'variant',
} as const
