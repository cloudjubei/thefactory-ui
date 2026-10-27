import type { ReactNode } from 'react'
import type {
  ProcessFeatureDelivery,
  ProcessOpenWork,
  ProcessOpenWorkChoice,
} from 'thefactory-tools/types'
// Not on the package's public surface: the launch card draws these itself. The showcase reaches
// into the source for them.
import AlreadyDoneNote from '../../src/web/compound/chat/AlreadyDoneNote'
import OpenWorkChooser from '../../src/web/compound/chat/OpenWorkChooser'
import type { Scene } from '../showcase/types'

const noop = (_choice: ProcessOpenWorkChoice) => {}

const BLOCKS =
  '“File tools: read PDFs and flag binaries” (62f6dc78) is still open on this story — add to it, or see it through first.'

const LIVE: ProcessOpenWork = {
  runId: '62f6dc78',
  state: 'awaiting-sign-off',
  title: 'File tools: read PDFs and flag binaries',
  branch: 'factory/file-tools-read-pdfs-62f6dc78',
  features: [{ kind: 'feature', id: 'f1', title: 'Read PDFs as text' }],
  newFeatures: [{ kind: 'feature', id: 'f2', title: 'Flag other binaries' }],
  options: [
    { choice: 'extend', available: true },
    { choice: 'new-on-branch', available: false, reason: BLOCKS },
    { choice: 'fresh', available: false, reason: BLOCKS },
  ],
  startedAt: 0,
}

const CANNOT_TAKE: ProcessOpenWork = {
  ...LIVE,
  state: 'running',
  newFeatures: [],
  options: [
    {
      choice: 'extend',
      available: false,
      reason:
        'That run already carries every feature left to work, so there is nothing new to add to it or build on top of it.',
    },
    { choice: 'new-on-branch', available: false, reason: BLOCKS },
    { choice: 'fresh', available: false, reason: BLOCKS },
  ],
}

const DELIVERED: ProcessFeatureDelivery[] = [
  {
    featureId: 'f1',
    featureTitle: 'Read PDFs as text',
    runId: '04bd5862',
    runTitle: 'File tools: read PDFs and flag binaries',
    sha: '597e5bd9a3c1f0e2d4b6a8c0e1f2a3b4c5d6e7f8',
  },
]

/** The host's live card for the open run, as a chat binds it; a fixed stand-in here. */
function runCard(standing: string): () => ReactNode {
  return () => (
    <div className="rounded-lg border border-(--border-subtle) bg-(--surface-raised) px-3 py-2 text-[12px] text-(--text-primary)">
      File tools: read PDFs and flag binaries · {standing}
    </div>
  )
}

function frame(children: ReactNode): ReactNode {
  return (
    <div className="flex w-[520px] max-w-full flex-col gap-2 bg-(--surface-base) p-3">
      {children}
    </div>
  )
}

export const OPEN_RUN_SCENES: Scene[] = [
  {
    id: 'story-open-run',
    title: 'Launch over an open run',
    component: 'OpenWorkChooser, AlreadyDoneNote',
    group: 'Chat',
    description:
      'Starting work on a story that already has a run going, parked or waiting for sign-off: no second run starts beside it. The launch card shows that run (its live card opens it) and offers only adding to it; features an earlier merged run delivered are named before anything starts.',
    states: [
      {
        id: 'add-only',
        title: 'Add to that run',
        description:
          'The open run waits for sign-off and can take the new feature: adding to it is the one way offered.',
        render: () =>
          frame(
            <OpenWorkChooser
              openWork={LIVE}
              choice={undefined}
              onChoose={noop}
              renderRun={runCard('Sign off →')}
            />,
          ),
      },
      {
        id: 'blocked',
        title: 'Cannot start',
        description:
          'The open run already carries every feature left: nothing can be added and nothing starts — open that run to see it through.',
        render: () =>
          frame(
            <OpenWorkChooser
              openWork={CANNOT_TAKE}
              choice={undefined}
              onChoose={noop}
              renderRun={runCard('Working')}
            />,
          ),
      },
      {
        id: 'already-done',
        title: 'Already done',
        description: 'A feature this launch would work was delivered by an earlier merged run.',
        render: () => frame(<AlreadyDoneNote deliveries={DELIVERED} />),
      },
    ],
  },
]
