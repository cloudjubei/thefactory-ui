import type { ProcessRun } from 'thefactory-tools/types'

import { RUN_CONVERSATION_COPY } from './processRunConversationConstants'
import type { RunConversationState, RunConversationView } from './processRunConversationTypes'

type ConversationRun = Pick<ProcessRun, 'id' | 'status' | 'cursor' | 'plan'>

const chatSteps = (run: Pick<ProcessRun, 'plan'>) =>
  run.plan.steps.filter((step) => step.kind === 'agent' && step.inChat === true)

/** Whether a step works as turns of the run's own chat: that chat is its conversation. Pure. */
export function isRunChatStep(run: Pick<ProcessRun, 'plan'>, stepId: string): boolean {
  return chatSteps(run).some((step) => step.id === stepId)
}

/**
 * The conversation of a run that works in its own chat, for the run's page:
 * the step whose conversation the chat is — the one the run is on, else its
 * first — and where it stands. An ask waiting in the chat comes first, on
 * whatever step the run is; else its step working. It is `due` — shown
 * without the person asking for it — while either holds. `undefined` for a
 * run none of whose steps work in its chat. Pure.
 */
export function runConversationView(
  run: ConversationRun,
  pendingAsks: number,
): RunConversationView | undefined {
  const steps = chatSteps(run)
  const on = steps.find((step) => step.id === run.cursor?.stepId)
  const step = on ?? steps[0]
  if (!step) return undefined
  const state: RunConversationState =
    pendingAsks > 0 ? 'asks' : run.status === 'running' && on ? 'working' : 'idle'
  return {
    stepId: step.id,
    title: step.name,
    state,
    line: state === 'asks' ? RUN_CONVERSATION_COPY.asks(pendingAsks) : RUN_CONVERSATION_COPY[state],
    asks: pendingAsks,
    due: state !== 'idle',
  }
}

/**
 * What names one time a run's conversation falls due: each pass of its step
 * working, and asks waiting. A page opens the conversation once per key, so
 * closing it holds until it falls due anew. Pure.
 */
export function runConversationOpenKey(
  run: ConversationRun,
  pendingAsks: number,
): string | undefined {
  const view = runConversationView(run, pendingAsks)
  if (!view?.due) return undefined
  return view.state === 'asks'
    ? `${run.id}:asks`
    : `${run.id}:working:${view.stepId}:${run.cursor?.iteration ?? 0}`
}
