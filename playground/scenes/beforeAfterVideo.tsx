import type { ReactNode } from 'react'
import type { ProcessProofVideoPair } from 'thefactory-tools/types'
import { requestProofChoices } from 'thefactory-ui/headless'
// Not on the package's public surface: the sign-off draws its walkthrough and its request composer
// itself. The showcase reaches into the source for them, as the playground renders from source.
import WalkthroughTab from '../../src/web/compound/chat/signoff/WalkthroughTab'
import { RequestProofSwitches } from '../../src/web/compound/process/ParkNoteComposer'
import type { Scene } from '../showcase/types'
import {
  RECORDING_ROUTES,
  VIDEO_COUNTED,
  VIDEO_NEW_SCREEN,
  VIDEO_NOT_COUNTED,
  VIDEO_PROJECT,
  VIDEO_REQUESTED,
  videoPairViews,
} from './beforeAfterVideoFixtures'
import { OnFixtures } from './onFixtures'

const noop = () => {}

const frame = (node: ReactNode, width = 'w-[720px]') => (
  <div className={`${width} max-w-full p-4`}>{node}</div>
)

function Walkthrough({ videoPairs }: { videoPairs: ProcessProofVideoPair[] }) {
  return (
    <OnFixtures routes={RECORDING_ROUTES}>
      <WalkthroughTab
        projectId={VIDEO_PROJECT}
        recordings={[]}
        videoPairs={videoPairViews(videoPairs)}
      />
    </OnFixtures>
  )
}

export const BEFORE_AFTER_VIDEO_SCENES: Scene[] = [
  {
    id: 'before-after-video',
    title: 'Before/after video',
    component: 'WalkthroughTab (videoPairs) · RequestProofSwitches (ParkNoteComposer)',
    group: 'Process',
    description:
      'A change to how something moves — scrolling, navigating, returning to a screen — is proven by the same path recorded on the base and on the change. The sign-off’s Walkthrough tab plays each pair side by side above any other recording, the counted ones first, each saying whether it counted and why not; a screen the change adds plays its After alone. Narrow, the pair stacks. A request for changes can require a video.',
    states: [
      {
        id: 'counted',
        title: 'A counted pair',
        description: 'Before and After of one path, side by side: “Shows the change”.',
        render: () => frame(<Walkthrough videoPairs={[VIDEO_COUNTED]} />),
      },
      {
        id: 'not-counted',
        title: 'A pair that did not count',
        description:
          'Recorded on two devices: it plays, but says why it does not count. A counted pair stays first.',
        render: () => frame(<Walkthrough videoPairs={[VIDEO_NOT_COUNTED, VIDEO_COUNTED]} />),
      },
      {
        id: 'new-screen',
        title: 'A new screen, its After alone',
        description:
          'A screen the change adds has no before: its After plays alone, with a note saying so.',
        render: () => frame(<Walkthrough videoPairs={[VIDEO_NEW_SCREEN]} />),
      },
      {
        id: 'narrow',
        title: 'Narrow: the pair stacks',
        description: 'At phone width, Before sits above After, each at full width.',
        render: () => frame(<Walkthrough videoPairs={[VIDEO_COUNTED]} />, 'w-[375px]'),
      },
      {
        id: 'request-video',
        title: 'Request changes: Require a before/after video',
        description:
          'The fix must show the change moving: the video switch on, beside on-screen proof.',
        render: () =>
          frame(
            <RequestProofSwitches
              choices={requestProofChoices()}
              picked={VIDEO_REQUESTED}
              onToggle={noop}
            />,
            'w-[640px]',
          ),
      },
    ],
  },
]
