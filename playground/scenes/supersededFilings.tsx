import ReportTab from '../../src/web/compound/chat/signoff/ReportTab'
import SupersededFilings from '../../src/web/compound/process/SupersededFilings'
import {
  SUPERSEDED_FILINGS_CURRENT,
  SUPERSEDED_FILINGS_REPLACED,
} from './supersededFilingsFixtures'
import type { Scene } from '../showcase/types'

/** A run's evidence, and a sign-off's: the current filings, then the replaced ones. */
function Evidence({ open }: { open: boolean }) {
  return (
    <div className="flex max-w-[720px] flex-col gap-2 p-4">
      <span className="text-[13px] font-semibold text-(--text-primary)">Evidence</span>
      <ReportTab reports={SUPERSEDED_FILINGS_CURRENT} />
      <SupersededFilings filings={SUPERSEDED_FILINGS_REPLACED} defaultOpen={open} />
    </div>
  )
}

export const SUPERSEDED_FILINGS_SCENES: Scene[] = [
  {
    id: 'superseded-filings',
    title: 'Superseded filings shown apart',
    component: 'SupersededFilings',
    group: 'Process',
    description:
      'A run’s evidence and a sign-off show the current filings first. What a fresh retry replaced is one collapsed row labelled Superseded; opening it keeps each filing labelled, and its text can still be read. A carry-on retry leaves the earlier filings current.',
    states: [
      {
        id: 'collapsed',
        title: 'Replaced filings collapsed',
        description:
          'The current feature report is open. Under it, a closed row labelled Superseded — 1 report and 1 screenshot from the first try.',
        render: () => <Evidence open={false} />,
      },
      {
        id: 'open',
        title: 'Replaced filings open',
        description:
          'The same current report, with the Superseded row open: the first try’s feature report, still labelled Superseded, and its screenshot.',
        render: () => <Evidence open={true} />,
      },
    ],
  },
]
