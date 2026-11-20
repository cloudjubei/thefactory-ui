import type { ProcessAgentPause, AgentPauseAction } from './processAgentPauseTypes'

/** Every word a paused agent's step says. */
export const AGENT_PAUSE_COPY = {
  paused: 'Paused',
  stripMark: 'paused',
  cause: {
    asleep: 'computer asleep',
    'cli-stopped': 'CLI stopped',
    'host-lost': 'agent stopped answering',
  } satisfies Record<ProcessAgentPause['cause'], string>,
  headline: {
    asleep: (step: string) => `The computer went to sleep during ${step}.`,
    'cli-stopped': (step: string) => `The agent’s CLI stopped during ${step}.`,
    'host-lost': (step: string) => `The agent stopped answering during ${step}.`,
  } satisfies Record<ProcessAgentPause['cause'], (step: string) => string>,
  canResume:
    'Its session is kept, so the agent can carry on where it stopped. This clears by itself if the agent comes back.',
  cannotResume:
    'Its session can’t be picked up. Retry step starts a new agent; what it filed stays.',
  resume: 'Resume',
  resumeTitle: 'Carries on the same session from where it stopped.',
  retry: 'Retry step',
  retryTitle: (step: string) => `Starts a new agent on ${step}. What it filed stays on the branch.`,
  stop: 'Stop run',
  stopAsk: 'Stop the run?',
  keep: 'Keep it',
  working: {
    resume: () => 'Resuming the same session…',
    retry: (step: string) => `Starting a new agent on ${step}…`,
    stop: () => 'Stopping the run…',
  } satisfies Record<AgentPauseAction, (step: string) => string>,
  failed: {
    resume: 'The agent could not be resumed.',
    retry: 'The step could not be retried.',
    stop: 'The run could not be stopped.',
  } satisfies Record<AgentPauseAction, string>,
  back: 'Back on its own',
  backLine: (time: string) => `The agent picked up again at ${time}. Nothing to do.`,
} as const

/** How long "Back on its own" stays on the step before it reads as running again. */
export const AGENT_PAUSE_CLEARED_NOTE_MS = 8000
