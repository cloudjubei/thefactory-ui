import { useState } from 'react'
import { RUN_THROUGH_TEXT, type CheckMethodRow, type ReviewTabId } from 'thefactory-ui/headless'
import { CheckChip, SignoffReportPanel } from 'thefactory-ui/web'
// Not on the package's public surface: the sign-off draws its tabs itself. The showcase reaches
// into the source for it, as the playground renders from source.
import RunThroughTab from '../../src/web/compound/chat/signoff/RunThroughTab'
import type { Scene } from '../showcase/types'
import { OnFixtures } from './onFixtures'
import {
  RUN_THROUGH_PROJECT,
  RUN_THROUGH_ROUTES,
  runThroughReportView,
  runThroughView,
  type RunThroughCase,
} from './runThroughFixtures'

type Tab = 'report' | 'runthrough'
type Chip = Pick<CheckMethodRow, 'id' | 'label' | 'state'> & { tab?: Tab }

/** The sign-off's evidence card as the story run shows it: its chips, and the tab open under them. */
function SignoffEvidence({ which, opens }: { which: RunThroughCase; opens: Tab }) {
  const [tab, setTab] = useState<Tab>(opens)
  const view = runThroughView(which)
  const chips: Chip[] = [
    { id: 'report', label: 'Report', state: 'passed', tab: 'report' },
    { id: 'tests', label: 'Tests', state: 'passed' },
    { id: 'build', label: 'Build', state: 'passed' },
    { id: 'diff', label: 'Code review', state: 'passed' },
    { id: 'walkthrough', label: 'Walkthrough', state: 'passed' },
    { id: 'runthrough', label: RUN_THROUGH_TEXT.label, state: view.state, tab: 'runthrough' },
  ]
  const open = (to: ReviewTabId) => {
    if (to === 'report' || to === 'runthrough') setTab(to)
  }
  return (
    <OnFixtures routes={RUN_THROUGH_ROUTES}>
      <div className="flex flex-col gap-3">
        <div className="text-[12.5px] text-(--text-secondary)">
          <b className="text-(--text-primary)">Sign-off</b> · Hot-seat play · story run
        </div>
        <section className="overflow-hidden rounded-xl border border-(--border-subtle) bg-(--surface-raised)">
          <div
            role="tablist"
            className="flex flex-wrap items-center gap-2 border-b border-(--border-subtle) px-5 py-3.5"
          >
            {chips.map((chip) => (
              <CheckChip
                key={chip.id}
                row={chip}
                role="tab"
                selected={chip.tab === tab}
                onClick={() => chip.tab && setTab(chip.tab)}
              />
            ))}
          </div>
          <div className="flex flex-col px-5 pb-5 pt-2">
            {tab === 'runthrough' ? (
              <RunThroughTab projectId={RUN_THROUGH_PROJECT} view={view} />
            ) : (
              <SignoffReportPanel view={runThroughReportView(which)} onOpenTab={open} />
            )}
          </div>
        </section>
      </div>
    </OnFixtures>
  )
}

const DESKTOP = 'w-[1100px]'
const PHONE = 'w-[390px]'

const frame = (which: RunThroughCase, width: string, opens: Tab = 'runthrough') => (
  <div className={`${width} max-w-full p-4`}>
    <SignoffEvidence which={which} opens={opens} />
  </div>
)

const CASES: { id: RunThroughCase; label: string }[] = [
  { id: 'clean', label: 'No issues, reached the end' },
  { id: 'mixed', label: 'Mixed issues' },
  { id: 'stopped', label: 'Stopped at a blocker' },
  { id: 'unrecorded', label: 'Not recorded' },
]

export const RUN_THROUGH_SCENES: Scene[] = [
  {
    id: 'run-through-tab',
    title: 'Run-through tab',
    component: 'RunThroughTab (StorySignoffReview, CliRunArtifactPanel)',
    group: 'Process',
    wide: true,
    description:
      'A tester’s run-through has its own tab beside Walkthrough. Its chip says how it went: ✓ no issues that matter, ! majors or minors, ✕ a blocker or a run that stopped short. The tab leads with the scenario, whether it reached the end or where it stopped, and the summary; then the run’s recording with each issue a tick on its moments, beside the issues worst first. The worst issue is open; opening an issue plays its moment, and its screenshot opens large. The report keeps one line for it in How it was proven, linked to the tab. On a phone the issues sit under the recording.',
    states: [
      {
        id: 'clean',
        title: 'No issues, reached the end',
        description: 'The chip passes; the list says nothing was flagged.',
        render: () => frame('clean', DESKTOP),
      },
      {
        id: 'mixed',
        title: 'Mixed severities',
        description:
          'Two majors, a minor and a nit, worst first; the chip is flagged. The first major is open with its details, screenshot and where it happened.',
        render: () => frame('mixed', DESKTOP),
      },
      {
        id: 'stopped',
        title: 'Stopped part-way',
        description:
          'The board froze on turn 3: the record says where it stopped, the blocker leads and the chip fails. The bar marks where the recording stopped.',
        render: () => frame('stopped', DESKTOP),
      },
      {
        id: 'phone',
        title: 'Phone: stopped part-way',
        description:
          'At phone width the chips wrap and the issues sit under the recording. Open with theme=dark for the dark look.',
        render: () => frame('stopped', PHONE),
      },
      {
        id: 'unrecorded',
        title: 'No recording',
        description:
          'The session was not recorded: the issues still list worst first, their times greyed, with nothing to play.',
        render: () => frame('unrecorded', DESKTOP),
      },
      {
        id: 'report-line',
        title: 'Its line in the report',
        description:
          'How it was proven says how the run-through went in one line; its Run-through link opens the tab.',
        render: () => frame('mixed', DESKTOP, 'report'),
      },
    ],
    controls: [
      {
        id: 'run',
        label: 'How it went',
        kind: 'choice',
        options: CASES,
        default: 'mixed',
      },
      { id: 'phone', label: 'Phone width', kind: 'toggle', default: false },
    ],
    presets: [
      { id: 'no-issues', name: 'No issues', values: { run: 'clean' } },
      {
        id: 'stopped-phone',
        name: 'Stopped, on a phone',
        values: { run: 'stopped', phone: 'true' },
      },
    ],
    play: (values) =>
      frame(
        CASES.find((c) => c.id === values.run)?.id ?? 'mixed',
        values.phone === 'true' ? PHONE : DESKTOP,
      ),
  },
]
