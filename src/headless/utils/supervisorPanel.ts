import type { ProcessManagerInterventionCard } from 'thefactory-tools/types'

import {
  SUPERVISOR_ACTION_DID,
  SUPERVISOR_ACTION_WHY,
  SUPERVISOR_PANEL_COPY,
} from './supervisorPanelConstants'
import type {
  ScopeStop,
  SupervisorAction,
  SupervisorActionView,
  SupervisorAnswerView,
  SupervisorAskView,
  SupervisorPanelView,
  SupervisorRecord,
} from './supervisorPanelTypes'

/** One action as the manager's intervention card, so it reads as "Handled" does on a run. Pure. */
function actionView(action: SupervisorAction): SupervisorActionView {
  const tool = action.tool ?? action.choice ?? SUPERVISOR_ACTION_DID[action.kind]
  const intervention: ProcessManagerInterventionCard['intervention'] = {
    id: action.id,
    at: action.at,
    runId: action.runId ?? '',
    parkedAt: action.parkedAt ?? action.at,
    signature: action.signature ?? action.id,
    tool,
    move: action.kind === 'answered' ? 'answer-park' : 'read',
    what: action.what,
    why: SUPERVISOR_ACTION_WHY[action.kind],
    ...(action.result ? { result: action.result } : {}),
    outcome: action.kind === 'refused' ? 'failed' : 'pending',
    actionKey: action.id,
    targetKey: action.signature ?? action.id,
  }
  return {
    id: action.id,
    at: action.at,
    card: { kind: 'intervention', intervention },
    standing: { intervention },
    ...(action.runId ? { runId: action.runId } : {}),
    ...(action.projectId ? { projectId: action.projectId } : {}),
  }
}

function askView(stop: ScopeStop): SupervisorAskView | undefined {
  const asked = stop.forPerson
  if (!asked || stop.managerHandling) return undefined
  const recommended: SupervisorAnswerView = {
    choice: asked.recommended.choice,
    label: asked.recommended.label,
    ...(asked.recommended.note ? { note: asked.recommended.note } : {}),
    recommended: true,
  }
  const others = asked.options
    .filter((o) => o.choice !== asked.recommended.choice || o.label !== asked.recommended.label)
    .map(
      (o): SupervisorAnswerView => ({
        choice: o.choice,
        label: o.label,
        ...(o.note ? { note: o.note } : {}),
        recommended: false,
      }),
    )
  return {
    key: `${stop.runId}:${stop.parkedAt}`,
    runId: stop.runId,
    rootRunId: stop.rootRunId,
    projectId: stop.projectId,
    title: stop.title,
    where: stop.stepName ?? stop.reason,
    question: asked.question,
    answers: [recommended, ...others],
    toolAsks: stop.asks.length,
  }
}

/**
 * The supervisor panel of a scope: its switch — the person's pick while it is
 * on its way, else the record's — what it did, newest first, as the per-run
 * manager's "Handled" cards, and each stop it hands over with its answers
 * ready, the recommended one first. Pure.
 */
export function supervisorPanelView(
  record: SupervisorRecord | undefined,
  stops: readonly ScopeStop[],
  enabledPick?: boolean,
): SupervisorPanelView {
  const enabled = enabledPick ?? record?.enabled ?? false
  const model = record?.fallbackModel?.model ?? record?.fallbackModel?.cli
  return {
    enabled,
    switchLabel: SUPERVISOR_PANEL_COPY.switchLabel,
    switchDetail: enabled ? SUPERVISOR_PANEL_COPY.on : SUPERVISOR_PANEL_COPY.off,
    ...(model ? { fallbackLine: SUPERVISOR_PANEL_COPY.fallback(model) } : {}),
    actions: (record?.actions ?? [])
      .filter((a) => a.kind !== 'asked')
      .sort((a, b) => b.at - a.at)
      .map(actionView),
    asks: stops.flatMap((stop) => askView(stop) ?? []),
  }
}
