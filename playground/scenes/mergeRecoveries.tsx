import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import type { ProcessRun } from 'thefactory-tools/types'
// Not on the package's public surface: the pipeline draws its stop itself. The showcase
// reaches into the source for it, as the playground renders the library from source.
import { ParkBlock } from '../../src/web/compound/process/ProcessPipeline'
import type { Scene } from '../showcase/types'
import {
  MERGE_CHECKS_FAILED_RUN,
  MERGE_OTHER_FAILURE_RUN,
  REVIEW_AGENT_REFUSED_RUN,
} from './mergeRecoveriesFixtures'

const noop = () => {}
const handedOn = async () => true

const frame = (node: ReactNode) => (
  <MemoryRouter>
    <div className="max-w-[720px] p-4">{node}</div>
  </MemoryRouter>
)

const park = (run: ProcessRun) =>
  frame(
    <ParkBlock
      run={run}
      managerLine={undefined}
      onChoose={noop}
      onChangeProof={noop}
      onAnswerRequest={noop}
      onDelegate={handedOn}
      onDrill={noop}
    />,
  )

export const MERGE_RECOVERY_SCENES: Scene[] = [
  {
    id: 'merge-recoveries',
    title: 'A merge stopped by failed checks',
    component: 'ParkBlock (ProcessPipeline) · ParkAnswers',
    group: 'Process',
    description:
      'A failed step can offer its own ways on beside Try again. A colleague review’s merge stopped by a pull request’s failed checks offers Re-run failed checks (re-runs the failed GitHub Actions jobs, waits, then merges) and Merge anyway (files viewed and approved first, merged without waiting, and the merge says the checks were skipped). Only a stop about failed checks offers them, and the stop says why in the step’s own words.',
    states: [
      {
        id: 'checks-failed',
        title: 'Checks failed: re-run or merge anyway',
        description:
          'The stop names the failed check and offers Try again, Re-run failed checks and Merge anyway, with Accept and carry on and Stop here below.',
        render: () => park(MERGE_CHECKS_FAILED_RUN),
      },
      {
        id: 'other-failure',
        title: 'Stopped for something else',
        description:
          'GitHub refused the merge for a review it still requires: the stop says so and offers only the usual answers.',
        render: () => park(MERGE_OTHER_FAILURE_RUN),
      },
      {
        id: 'agent-refused',
        title: 'The review’s agent refused',
        description:
          'The review chat’s CLI refused with its plan limit. The step’s summary and the stop carry the CLI’s own words.',
        render: () => park(REVIEW_AGENT_REFUSED_RUN),
      },
    ],
  },
]
