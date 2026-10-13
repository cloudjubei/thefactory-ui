import { PROCESS_MANAGER_ESCALATION_LABELS } from 'thefactory-tools/constants'
import type {
  ProcessManagerBriefCard,
  ProcessManagerEscalationCard,
  ProcessManagerInterventionCard,
  ProcessManagerPreReadCard,
} from 'thefactory-tools/types'
import {
  MANAGER_BRIEF_LIMITS,
  MANAGER_BRIEF_LINES,
  MANAGER_BRIEF_MODE_LABELS,
  MANAGER_BRIEF_TRIED_NOTHING,
  MANAGER_BRIEF_TRIES,
  MANAGER_ESCALATION_TITLE,
  MANAGER_OUTCOME_HANDLED,
  MANAGER_OUTCOME_NEEDS_YOU,
  MANAGER_OUTCOME_PILLS,
  MANAGER_OUTCOME_ON_STEP,
  MANAGER_OUTCOME_PRE_READ,
  MANAGER_OUTCOME_PRE_READ_TOOL,
  MANAGER_OUTCOME_RECOMMENDED,
  MANAGER_STOP_LINE,
} from './managerCardsConstants'
import type {
  ManagerBriefView,
  ManagerEscalationView,
  ManagerInterventionStanding,
  ManagerOutcomeView,
  ManagerPreReadStanding,
} from './managerCardsTypes'
import type { ParkStanding } from './processParkStandingTypes'
import { formatFriendlyTimestamp } from './time'

/** The manager's brief as its card reads it. Pure but for the reader's clock and locale. */
export function managerBriefView(card: ProcessManagerBriefCard): ManagerBriefView {
  const at = formatFriendlyTimestamp(new Date(card.parkedAt).toISOString())
  return {
    stopLine: `${MANAGER_STOP_LINE(card.mode, card.stepName)} · ${at}`,
    line: MANAGER_BRIEF_LINES[card.mode](card.stepName),
    mode: MANAGER_BRIEF_MODE_LABELS[card.mode],
    stopped: card.message ? `${card.stepName} — ${card.message}` : card.stepName,
    failed: card.failed,
    answers: card.answers.map((a) => ({ key: a.choice, label: a.label })),
    tried: card.tried.length > 0 ? card.tried.join('\n') : MANAGER_BRIEF_TRIED_NOTHING,
    tries: MANAGER_BRIEF_TRIES(card.triesUsed, card.triesMax),
    triesShare: card.triesMax > 0 ? Math.min(1, card.triesUsed / card.triesMax) : 0,
    limits: MANAGER_BRIEF_LIMITS,
  }
}

/**
 * What came of a manager turn — something it did, or its pre-read — as its
 * outcome card reads it: as posted, or, with its `standing`, as the run has it
 * now (how the intervention came out; which items were settled since and how
 * the sign-off was decided). Pure.
 */
export function managerOutcomeView(
  card: ProcessManagerInterventionCard | ProcessManagerPreReadCard,
  standing?: ManagerInterventionStanding | ManagerPreReadStanding,
): ManagerOutcomeView {
  if (card.kind === 'intervention') {
    const { stepName } = card
    const live = standing && 'intervention' in standing ? standing.intervention : undefined
    const intervention = live ?? card.intervention
    return {
      headline: intervention.what,
      tone: 'handled',
      pill: live ? MANAGER_OUTCOME_PILLS[live.outcome] : MANAGER_OUTCOME_HANDLED,
      why: intervention.why,
      ...(live?.result ? { result: live.result } : {}),
      open: [],
      did: stepName ? MANAGER_OUTCOME_ON_STEP(intervention.tool, stepName) : intervention.tool,
    }
  }
  const { items, summary } = card.preRead
  const settled = standing && 'settled' in standing ? standing.settled : {}
  const closure = standing && 'settled' in standing ? standing.closure : undefined
  const stillOpen = closure ? 0 : items.filter((i) => !settled[i.itemId]).length
  return {
    headline: MANAGER_OUTCOME_PRE_READ,
    tone: stillOpen > 0 ? 'needs-you' : 'handled',
    pill: stillOpen > 0 ? MANAGER_OUTCOME_NEEDS_YOU(stillOpen) : MANAGER_OUTCOME_HANDLED,
    why: summary,
    open: items.map((i) => {
      const how = settled[i.itemId]
      return {
        id: i.itemId,
        text: MANAGER_OUTCOME_RECOMMENDED(i.finding, i.recommendation),
        ...(how ? { settled: how } : {}),
      }
    }),
    did: MANAGER_OUTCOME_PRE_READ_TOOL,
    ...(closure ? { closure } : {}),
  }
}

/**
 * A park the manager handed to the person, as its card reads it — with how the
 * park was closed once its `standing` says the run no longer waits at it. Pure.
 */
export function managerEscalationView(
  card: ProcessManagerEscalationCard,
  standing?: ParkStanding,
): ManagerEscalationView {
  const { escalation } = card
  return {
    title: MANAGER_ESCALATION_TITLE,
    headline: PROCESS_MANAGER_ESCALATION_LABELS[escalation.why],
    what: escalation.what,
    found: escalation.found,
    tried: escalation.tried,
    recommendation: escalation.recommendation,
    ...(standing?.state === 'closed' ? { closure: standing.closure } : {}),
  }
}
