import type { FeatureRequestResumeMode } from 'thefactory-tools/types'

/** The ways a sender can continue when a request it sent ends, in the order the picker offers them. */
export const CROSS_PROJECT_RESUME_OPTIONS: readonly {
  value: FeatureRequestResumeMode
  label: string
  /** The one word it reads as beside another setting. */
  short: string
}[] = [
  { value: 'ask', label: 'Ask — before the agent carries on', short: 'Ask' },
  { value: 'notify', label: 'Notify — I reopen the chat', short: 'Notify' },
  { value: 'auto', label: 'Automatic — the agent carries on', short: 'Automatic' },
]

/** What the Cross-project settings say about a request a project sent. */
export const CROSS_PROJECT_RESUME_COPY = {
  label: 'When a request you sent finishes',
  override: (project: string) => `When a request ${project} sent finishes`,
  useDefault: (label: string) => `Use default (${label})`,
  effective: 'Effective for this project:',
} as const

/** The picker value that means this project follows the default. */
export const CROSS_PROJECT_USE_DEFAULT = '__default'
