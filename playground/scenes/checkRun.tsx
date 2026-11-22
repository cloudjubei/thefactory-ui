import CliRunArtifactPanel from '../../src/web/compound/chat/CliRunArtifactPanel'
import type { Scene } from '../showcase/types'
import {
  CHECK_RUN_CASES,
  CHECK_RUN_RUN,
  checkRunCase,
  checkRunRoutes,
  checkRunSteps,
  type CheckRunCase,
} from './checkRunFixtures'
import { Acted, OnFixtures } from './onFixtures'

/** The real sign-off panel on a run's fixtures, its Tests tab open, and Run pressed where the case says. */
function Panel({ which }: { which: CheckRunCase }) {
  return (
    <OnFixtures key={which} routes={checkRunRoutes(which)}>
      <Acted steps={checkRunSteps(which)}>
        <div className="w-[760px] max-w-full">
          <CliRunArtifactPanel runId={CHECK_RUN_RUN.id} projectId={CHECK_RUN_RUN.projectId} />
        </div>
      </Acted>
    </OnFixtures>
  )
}

export const CHECK_RUN_SCENES: Scene[] = [
  {
    id: 'review-check-run',
    title: 'Review — run one check',
    component: 'CliRunArtifactPanel (ChecksTab)',
    group: 'Chat',
    description:
      'Every block on the sign-off’s Tests and Build tabs has its own Run: it re-runs that layer or method alone through POST /cli-runs/:runId/verify with its checkIds, and the result merges into the verification at the same head. While it runs, that block spins, every other Run waits, and the panel names what is running. A read-only record offers none.',
    states: CHECK_RUN_CASES.map((item) => ({
      id: item.id,
      title: item.label,
      description: item.note,
      render: () => <Panel which={item.id} />,
    })),
    controls: [
      {
        id: 'case',
        label: 'Where the re-run is',
        kind: 'choice',
        options: CHECK_RUN_CASES.map(({ id, label }) => ({ id, label })),
        default: 'idle',
      },
    ],
    play: (values) => <Panel which={checkRunCase(values.case)} />,
  },
]
