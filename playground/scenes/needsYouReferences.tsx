import type { ReactNode } from 'react'
import type { ProcessNeedsYouItem, ReferenceDescription } from 'thefactory-tools/types'
import { processNeedsYouItemId } from 'thefactory-tools/utils'
import { needsYouReferenceView, type NeedsYouItemLink } from 'thefactory-ui/headless'
// Not on the package's public surface as a scene needs it: the showcase reaches into the source,
// as the playground renders the library from source.
import { NeedsYouReferenceChipView } from '../../src/web/compound/chips/NeedsYouReferenceChip'
import type { Scene } from '../showcase/types'

const noop = () => {}
const RUN = 'de8dcffe-776f-44bf-94a3-2e49ceb1d3fc'
const RUN_TITLE = 'CLI run store and capture at scale'

const CACHE =
  'Transient pdfjs failures stay cached — decide whether a retry should read the file again or keep the cached failure.'
const LOGS =
  'Sign-off despite Verify failing on the device — decide whether the captured logs are enough to merge on.'
const SIZE = 'Decide on a size cap for PDFs read as text.'

const item = (text: string, settled?: string): ProcessNeedsYouItem => {
  const id = processNeedsYouItemId(text)
  return {
    id,
    text,
    ...(settled
      ? { resolution: { itemId: id, text, kind: 'resolved' as const, summary: settled, at: 1 } }
      : {}),
  }
}

const link = (text: string): NeedsYouItemLink => ({
  kind: 'run',
  projectId: 'thefactory-backend',
  runId: RUN,
  needsYouItemId: processNeedsYouItemId(text),
})

const READING: ReferenceDescription = {
  kind: 'run',
  label: 'Needs you item',
  detail: 'A “Needs you” item of run de8dcffe',
}

const chip = (text: string, found: ProcessNeedsYouItem | undefined) => (
  <NeedsYouReferenceChipView
    view={needsYouReferenceView({ link: link(text), item: found, runTitle: RUN_TITLE })}
    description={READING}
    onOpen={noop}
  />
)

const message = (children: ReactNode) => (
  <div className="max-w-[720px] p-4">
    <div className="rounded-xl border border-(--border-subtle) bg-(--surface-raised) px-4 py-3 text-[14px] leading-7 text-(--text-primary)">
      {children}
    </div>
  </div>
)

export const NEEDS_YOU_REFERENCE_SCENES: Scene[] = [
  {
    id: 'needs-you-references',
    title: '“Needs you” items in a message',
    component: 'NeedsYouReferenceChip',
    group: 'Chat',
    description:
      'A “Needs you” item is written `&run/<runId>/<itemId>` — as stories, features and notes are — so a message shows the item, never its `ny-…` id: its leading phrase, open or settled as a pill, the rest of it, its run and how it was settled on hover, and a click that opens the run’s sign-off on its Report with the item brought into view and lit. The manager and the run’s chat are told to write items that way, and “Sort these out with the manager” sends each item as one.',
    states: [
      {
        id: 'manager-reply',
        title: 'The manager’s plan, item by item',
        render: () =>
          message(
            <ol className="m-0 flex list-decimal flex-col gap-1 pl-5">
              <li>
                {chip(CACHE, item(CACHE))} — serious: a retry never reads the file again. Fix it in
                this run.
              </li>
              <li>
                {chip(LOGS, item(LOGS))} — the logs show Verify’s failure is the emulator, not the
                change. Fine as it is.
              </li>
              <li>{chip(SIZE, item(SIZE, 'Cap at 50 MB'))} — already settled.</li>
            </ol>,
          ),
      },
      {
        id: 'triage-brief',
        title: 'What “Sort these out with the manager” sends',
        render: () =>
          message(
            <>
              <p className="m-0">
                <strong>Sort out the open “Needs you” items with me.</strong> For each one below,
                look into it, say how serious it is, and recommend one course.
              </p>
              <ol className="m-0 mt-2 flex list-decimal flex-col gap-1 pl-5">
                <li>{chip(CACHE, item(CACHE))}</li>
                <li>{chip(LOGS, item(LOGS))}</li>
              </ol>
            </>,
          ),
      },
      {
        id: 'reading-and-gone',
        title: 'Still being read, and no longer on the report',
        render: () =>
          message(
            <p className="m-0">
              <NeedsYouReferenceChipView view={undefined} description={READING} /> is being read;{' '}
              {chip(SIZE, undefined)} was taken off the report when it was filed again.
            </p>,
          ),
      },
    ],
  },
]
