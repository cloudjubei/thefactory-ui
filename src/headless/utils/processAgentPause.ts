import type { ProcessRun } from 'thefactory-tools/types'

import { AGENT_PAUSE_COPY } from './processAgentPauseConstants'
import type {
  AgentPauseAction,
  AgentPauseButton,
  AgentPauseDecisionEvent,
  AgentPauseDecisionState,
  AgentPauseStepView,
  ProcessAgentPause,
  ProcessRunWithPause,
} from './processAgentPauseTypes'

/** The agent a run's step paused on, as its run view carries it; none when it runs on. Pure. */
export function processAgentPauseOf(
  run: ProcessRun | ProcessRunWithPause,
): ProcessAgentPause | undefined {
  return 'agentPause' in run ? run.agentPause : undefined
}

/** A moment of the day as the clock says it — `14:09`. Pure for a given time zone. */
export function agentPauseClockTime(at: number): string {
  const date = new Date(at)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function offers(pause: ProcessAgentPause, action: AgentPauseAction): boolean {
  if (action === 'resume' && !pause.canResume) return false
  return pause.actions.includes(action)
}

/** Whether `action` would be sent now: a pause offers it and nothing else is on its way. Pure. */
export function agentPauseCanDecide(
  state: AgentPauseDecisionState,
  action: AgentPauseAction,
): boolean {
  return Boolean(state.pause && !state.pending && offers(state.pause, action))
}

/**
 * A paused agent's state, moved by what happens: the run as read, the person's
 * action — one at a time, repeats ignored — and a refusal, which puts the
 * pause back with its reason. A pause that clears with no action of the
 * person's leaves a note that the agent came back by itself. Pure.
 */
export function agentPauseDecision(
  state: AgentPauseDecisionState,
  event: AgentPauseDecisionEvent,
): AgentPauseDecisionState {
  switch (event.type) {
    case 'seen': {
      const { pause } = event
      if (pause) {
        if (state.pause === pause) return state
        return state.pause?.entryId === pause.entryId ? { ...state, pause } : { pause }
      }
      if (!state.pause) return state
      if (state.pending) return {}
      return { cleared: { stepId: state.pause.stepId, at: event.at } }
    }
    case 'decide': {
      const { pause } = state
      if (!pause || !agentPauseCanDecide(state, event.action)) return state
      return {
        pause,
        pending: { action: event.action, entryId: pause.entryId, stepId: pause.stepId },
      }
    }
    case 'failed':
      return { ...(state.pause ? { pause: state.pause } : {}), error: event.error }
    case 'note-done':
      return {}
  }
}

/** The run as it is shown: running on once an action is on its way, ahead of the server. Pure. */
export function agentPauseShownRun<T extends ProcessRunWithPause>(
  run: T | undefined,
  state: AgentPauseDecisionState,
): T | undefined {
  if (!run || !state.pending || !run.agentPause) return run
  const shown = { ...run }
  delete shown.agentPause
  return shown
}

/**
 * What the paused step shows under itself: why it paused, with Resume when its
 * session can be carried on, Retry step, and Stop run confirmed in place; what
 * is happening once one is chosen; or that the agent came back by itself.
 * Nothing when no agent is paused. Pure.
 */
export function agentPauseStepView(
  state: AgentPauseDecisionState,
  stepName: string,
): AgentPauseStepView | undefined {
  if (state.pending) {
    return {
      kind: 'working',
      stepId: state.pending.stepId,
      text: AGENT_PAUSE_COPY.working[state.pending.action](stepName),
    }
  }
  const { pause } = state
  if (!pause) {
    if (!state.cleared) return undefined
    return {
      kind: 'cleared',
      stepId: state.cleared.stepId,
      title: AGENT_PAUSE_COPY.back,
      text: AGENT_PAUSE_COPY.backLine(agentPauseClockTime(state.cleared.at)),
    }
  }
  const buttons: AgentPauseButton[] = [
    ...(offers(pause, 'resume')
      ? [
          {
            action: 'resume' as const,
            label: AGENT_PAUSE_COPY.resume,
            title: AGENT_PAUSE_COPY.resumeTitle,
          },
        ]
      : []),
    ...(offers(pause, 'retry')
      ? [
          {
            action: 'retry' as const,
            label: AGENT_PAUSE_COPY.retry,
            title: AGENT_PAUSE_COPY.retryTitle(stepName),
          },
        ]
      : []),
  ]
  return {
    kind: 'paused',
    stepId: pause.stepId,
    line: `${AGENT_PAUSE_COPY.paused} · ${AGENT_PAUSE_COPY.cause[pause.cause]}`,
    headline: pause.reason.trim() || AGENT_PAUSE_COPY.headline[pause.cause](stepName),
    body: pause.canResume ? AGENT_PAUSE_COPY.canResume : AGENT_PAUSE_COPY.cannotResume,
    buttons,
    ...(offers(pause, 'stop')
      ? {
          stop: {
            label: AGENT_PAUSE_COPY.stop,
            ask: AGENT_PAUSE_COPY.stopAsk,
            confirm: AGENT_PAUSE_COPY.stop,
            keep: AGENT_PAUSE_COPY.keep,
          },
        }
      : {}),
    ...(state.error ? { error: state.error } : {}),
  }
}
