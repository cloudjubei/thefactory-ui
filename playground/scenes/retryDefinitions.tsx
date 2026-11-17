import type { ReactNode } from 'react'
import {
  type ProcessRetryDefinitionChoice,
  type ProcessRetryDefinitionsOffer,
  type ProcessRetryPick,
} from 'thefactory-ui/headless'
import RetryChoiceOptions from '../../src/web/compound/process/RetryChoiceOptions'
import { RETRY_DEFINITIONS_NEWER, RETRY_DEFINITIONS_SAME } from './retryDefinitionsFixtures'
import type { Scene } from '../showcase/types'

const noop = () => {}

const frame = (node: ReactNode) => <div className="max-w-[720px] p-4">{node}</div>

/** The retry choice on a stopped step, settled on the versions `picked` names. */
function Card({
  offer,
  picked,
}: {
  offer: ProcessRetryDefinitionsOffer
  picked?: ProcessRetryDefinitionChoice
}) {
  const pick: ProcessRetryPick = picked ? { definitions: picked } : {}
  return frame(
    <div className="flex flex-col gap-2 rounded-lg border border-(--accent-primary)/50 bg-(--surface-raised) px-3.5 py-3">
      <span className="text-[14.5px] font-semibold text-(--text-primary)">Try again</span>
      <span className="text-[12.5px] leading-snug text-(--text-secondary)">
        Run this step again.
      </span>
      <RetryChoiceOptions definitions={offer} pick={pick} onPick={noop} />
    </div>,
  )
}

export const RETRY_DEFINITIONS_SCENES: Scene[] = [
  {
    id: 'retry-definitions',
    title: 'A retry names the version it runs',
    component: 'RetryChoiceOptions',
    group: 'Process',
    description:
      'The retry choice on a stopped step names the versions it will run — the step’s agent type and its process, frozen with the run. When a newer definition exists, the same card shows both and the person picks. "This run’s" is selected unless they choose "Current"; trying again runs the one that is selected.',
    states: [
      {
        id: 'this-run',
        title: 'The versions this run started with',
        description:
          'Nothing newer exists. The card names Reviewer, version 4 and Feature, version 2 — what Try again runs.',
        render: () => <Card offer={RETRY_DEFINITIONS_SAME} />,
      },
      {
        id: 'newer',
        title: 'A newer reviewer is offered',
        description:
          'This run’s Reviewer is version 4 and the current one is version 7; Feature stays version 2. Both are on the card, and This run’s is selected, so Try again runs version 4.',
        render: () => <Card offer={RETRY_DEFINITIONS_NEWER} picked="frozen" />,
      },
      {
        id: 'current',
        title: 'The current versions, chosen',
        description:
          'Current is selected. Try again runs Reviewer, version 7 and Feature, version 2 — the current definitions — and the attempt records that choice.',
        render: () => <Card offer={RETRY_DEFINITIONS_NEWER} picked="current" />,
      },
    ],
  },
]
