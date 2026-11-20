import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { processStepStates } from 'thefactory-tools/utils'

import {
  agentPauseCanDecide,
  agentPauseDecision,
  agentPauseShownRun,
  agentPauseStepView,
  processAgentPauseOf,
} from '../utils/processAgentPause'
import { AGENT_PAUSE_CLEARED_NOTE_MS, AGENT_PAUSE_COPY } from '../utils/processAgentPauseConstants'
import type {
  AgentPauseAction,
  AgentPauseDecisionState,
  AgentPauseStepView,
  ProcessRunWithPause,
} from '../utils/processAgentPauseTypes'

export type UseAgentPauseDecision<T extends ProcessRunWithPause> = {
  /** The run as it is shown: running on at once when an action is taken. */
  shownRun: T | undefined
  /** What the paused step shows under itself; absent when no agent is paused. */
  step: AgentPauseStepView | undefined
  /** Resume, retry or stop: shown done at once, taken back when refused; repeats do nothing. */
  decide: (action: AgentPauseAction) => void
}

/**
 * A run's paused agent as the person answers it ({@link agentPauseDecision}):
 * an action shows the run running on at once and is sent behind; a refusal
 * puts the pause back with its reason; a pause that clears by itself says so
 * on the step for a moment.
 */
export function useAgentPauseDecision<T extends ProcessRunWithPause>(
  run: T | undefined,
  send: (action: AgentPauseAction) => Promise<boolean>,
): UseAgentPauseDecision<T> {
  const pause = run ? processAgentPauseOf(run) : undefined
  const [state, dispatch] = useReducer(
    agentPauseDecision,
    pause,
    (seen): AgentPauseDecisionState => (seen ? { pause: seen } : {}),
  )
  const stateRef = useRef(state)
  stateRef.current = state

  const changedAt = run?.updatedAt
  useEffect(() => {
    dispatch({ type: 'seen', pause, at: changedAt ?? Date.now() })
  }, [pause, changedAt])

  useEffect(() => {
    if (!state.cleared) return
    const timer = setTimeout(() => dispatch({ type: 'note-done' }), AGENT_PAUSE_CLEARED_NOTE_MS)
    return () => clearTimeout(timer)
  }, [state.cleared])

  const decide = useCallback(
    (action: AgentPauseAction) => {
      if (!agentPauseCanDecide(stateRef.current, action)) return
      dispatch({ type: 'decide', action })
      void send(action).then((sent) => {
        if (!sent) dispatch({ type: 'failed', error: AGENT_PAUSE_COPY.failed[action] })
      })
    },
    [send],
  )

  const stepId = state.pending?.stepId ?? state.pause?.stepId ?? state.cleared?.stepId
  const stepName = useMemo(
    () =>
      run && stepId
        ? (processStepStates(run).find((s) => s.step.id === stepId)?.step.name ?? stepId)
        : '',
    [run, stepId],
  )
  const step = useMemo(() => agentPauseStepView(state, stepName), [state, stepName])
  const shownRun = useMemo(() => agentPauseShownRun(run, state), [run, state])
  return { shownRun, step, decide }
}
