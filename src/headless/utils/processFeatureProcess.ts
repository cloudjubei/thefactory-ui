import { PROCESS_FEATURE_PROCESS_IDS } from 'thefactory-tools/constants'
import type { ProcessPlan, ProcessProposal } from 'thefactory-tools/types'
import { processPlanFeatureProcessId } from 'thefactory-tools/utils'

import { FEATURE_PROCESS_COPY } from './processFeatureProcessConstants'
import type { FeatureProcessMetadata, FeatureProcessOptionView } from './processFeatureProcessTypes'

/** The ways a story's features can be worked, in the order the approval offers them. */
export function featureProcessOptions(): FeatureProcessOptionView[] {
  return PROCESS_FEATURE_PROCESS_IDS.flatMap((processId) => {
    const copy = FEATURE_PROCESS_COPY[processId]
    return copy ? [{ processId, ...copy }] : []
  })
}

/** The process a launch proposal works each feature by, or `undefined` when it works none one by one. */
export function proposalFeatureProcessId(
  proposal: ProcessProposal | undefined,
): string | undefined {
  return proposal?.steps.find((node) => node.kind === 'process' && node.subject?.kind === 'feature')
    ?.processId
}

/**
 * The way the approval shows as chosen, from `own` — the process the story
 * process nests on its own — and the person's pick: the pick, else `own`. The
 * choice is offered only when `own` is one of the ways offered: a story process
 * that nests one of its own (a project's specialised intake) keeps it whatever
 * was picked, and one that works no features one by one has none.
 */
export function featureProcessChoice(
  own: string | undefined,
  picked: string | undefined,
): string | undefined {
  if (!own || !PROCESS_FEATURE_PROCESS_IDS.includes(own)) return undefined
  return picked ?? own
}

/** The approval's metadata for `choice`, or `undefined` when nothing offered is chosen. */
export function featureProcessMetadata(
  choice: string | undefined,
): FeatureProcessMetadata | undefined {
  return choice && PROCESS_FEATURE_PROCESS_IDS.includes(choice)
    ? { featureProcessId: choice }
    : undefined
}

/**
 * How a run's features were worked, in the words the approval offered — read
 * from the plan it froze. `undefined` for a plan that works no features one by
 * one, or nests a process the approval does not name.
 */
export function featureProcessLabel(plan: Pick<ProcessPlan, 'steps'>): string | undefined {
  const processId = processPlanFeatureProcessId(plan)
  return processId ? FEATURE_PROCESS_COPY[processId]?.label : undefined
}
