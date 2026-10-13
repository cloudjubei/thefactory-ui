import type { ProcessManagerChatCard } from 'thefactory-tools/types'

import {
  managerEscalationStanding,
  managerInterventionStanding,
  managerPreReadStanding,
} from '../utils/managerCardStanding'
import type { ManagerCardStanding } from '../utils/managerCardsTypes'
import { useProcessRun } from './useProcessRun'

type OutcomeOrEscalationCard = Exclude<ProcessManagerChatCard, { kind: 'brief' }>

function holderIdOf(card: OutcomeOrEscalationCard): string {
  if (card.kind === 'escalation') return card.escalation.runId
  if (card.kind === 'pre-read') return card.preRead.runId
  return card.intervention.runId
}

/**
 * Where a manager card's subject stands now, kept live off the runs it is
 * about: the top-level run the card was posted for (`processRunId`, which
 * keeps the manager's record) and the run that stopped, when that is a nested
 * one. Every client and chat kind reads its cards through this, so a park
 * answered on the run page, in another client or another chat closes the card
 * here the moment the run's record moves.
 */
export function useManagerCardStanding(
  card: OutcomeOrEscalationCard,
  processRunId: string | undefined,
): ManagerCardStanding {
  const holderId = holderIdOf(card)
  const rootId = processRunId ?? holderId
  const { run: root } = useProcessRun(rootId)
  const nested = card.kind !== 'intervention' && holderId !== rootId
  const { run: nestedHolder } = useProcessRun(nested ? holderId : undefined)
  const holder = nested ? nestedHolder : root
  if (card.kind === 'escalation') {
    return {
      kind: 'escalation',
      standing: managerEscalationStanding(card.escalation, root, holder),
    }
  }
  if (card.kind === 'pre-read') {
    return { kind: 'pre-read', standing: managerPreReadStanding(card.preRead, holder) }
  }
  return { kind: 'intervention', standing: managerInterventionStanding(card.intervention, root) }
}
