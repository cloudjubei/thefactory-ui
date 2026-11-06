import type { AccessRecord } from 'thefactory-tools/types'
import { accessRecordSection, signoffReportView } from 'thefactory-ui/headless'
import { SignoffReportPanel } from 'thefactory-ui/web'

import RunDetails from '../../src/web/compound/process/RunDetails'
import type { Scene } from '../showcase/types'

const NAMES = {
  'thefactory-backend': 'Factory Backend',
  'thefactory-ui': 'Factory UI',
}

/** A cross-project read, an automatic merge, and a sign-off — oldest first. */
const RECORDS: AccessRecord[] = [
  {
    who: 'agent',
    what: 'cross-project read',
    targetProjectId: 'thefactory-backend',
    tool: 'readPaths',
    why: 'Reads are allowed across projects.',
    at: Date.UTC(2026, 10, 4, 8, 44),
  },
  {
    who: 'manager',
    what: 'auto-merge',
    targetProjectId: 'thefactory-ui',
    tool: 'merge',
    why: 'The work was approved and auto-merge is on.',
    at: Date.UTC(2026, 10, 4, 9, 2),
  },
  {
    who: 'person',
    what: 'sign-off',
    targetProjectId: 'thefactory-ui',
    tool: 'sign-off',
    why: 'You approved it on the web.',
    at: Date.UTC(2026, 10, 4, 9, 5),
  },
]

const access = accessRecordSection(RECORDS, NAMES)

function Report() {
  return (
    <div className="max-w-2xl px-4 pb-4">
      <SignoffReportPanel
        hideTiles
        view={signoffReportView({
          report: {
            ref: {
              reportSections: {
                outcome: { headline: 'The run finished.' },
                howProven: [],
                decisions: [],
                needsYou: [],
              },
            },
          },
          featureCount: 1,
          criteriaCount: 0,
          criteriaMet: undefined,
          featuresDelivered: { done: 1, total: 1 },
          took: { duration: undefined, cost: undefined },
          tabs: [],
          accessRecords: RECORDS,
          projectNames: NAMES,
        })}
      />
    </div>
  )
}

function OnTheRun() {
  if (!access) return null
  return (
    <div className="max-w-2xl">
      <RunDetails workAdded={[]} access={access} accessOpen />
    </div>
  )
}

export const RUN_ACCESS_SCENES: Scene[] = [
  {
    id: 'run-access',
    title: 'Access record on a run',
    component: 'SignoffReportPanel, RunDetails',
    group: 'Process',
    description:
      'Cross-project access and automatic actions recorded on a run: who, what, the project, the tool, why, and when. The report lists them open. The run page keeps the same list under More about this run.',
    states: [
      {
        id: 'report',
        title: 'In the report',
        description:
          'The run report’s Access section: an agent read Factory Backend, the manager merged, and you signed off.',
        render: () => <Report />,
      },
      {
        id: 'on-the-run',
        title: 'On the run page',
        description:
          'The same trail opened under More about this run. On the run page it starts folded to “3 records”.',
        render: () => <OnTheRun />,
      },
    ],
  },
]
