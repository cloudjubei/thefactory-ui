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
 * The way the approval shows as chosen: the person's pick, else the one the
 * story process nests when it is one of those offered — `undefined` for a
 * process that works no features one by one, or nests one not offered.
 */
export function featureProcessChoice(
  proposal: ProcessProposal | undefined,
  picked: string | undefined,
): string | undefined {
  const nested = proposalFeatureProcessId(proposal)
  if (!nested) return undefined
  if (picked) return picked
  return PROCESS_FEATURE_PROCESS_IDS.includes(nested) ? nested : undefined
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
