import { useState, type ReactNode } from 'react'
import { recordingSitesView, type RecordingSitesSnapshot } from 'thefactory-ui/headless'
import { RecordingSitesPanel, SlackReviewSettingsPanel } from 'thefactory-ui/web'
import type { Scene } from '../showcase/types'
import { RECORDING_SITES_STATES, RECORDINGS_NOW } from './recordingSitesFixtures'
import { SOURCE_SETTINGS_SET, slackSettings } from './slackReviewFixtures'

const noop = () => {}

type Width = 'page' | 'phone'

const frame = (width: Width, children: ReactNode) => (
  <div className={`${width === 'phone' ? 'w-[390px]' : 'w-[760px]'} max-w-full p-4`}>
    {children}
  </div>
)

/** The snapshot with a press laid over it at once, as the store does while the backend answers. */
function usePresses(start: RecordingSitesSnapshot) {
  const [snapshot, setSnapshot] = useState(start)
  const onSignIn = (siteId: string) =>
    setSnapshot({
      ...snapshot,
      starting: [...snapshot.starting, siteId],
      failed: {},
    })
  return { view: recordingSitesView(snapshot, RECORDINGS_NOW), onSignIn }
}

function Recordings({ start, width }: { start: RecordingSitesSnapshot; width: Width }) {
  const { view, onSignIn } = usePresses(start)
  return frame(width, <RecordingSitesPanel view={view} onSignIn={onSignIn} />)
}

function InSettings() {
  const { view, onSignIn } = usePresses(RECORDING_SITES_STATES['signed-out']!)
  return frame(
    'page',
    <div className="flex flex-col gap-8">
      <SlackReviewSettingsPanel
        state={slackSettings({ status: SOURCE_SETTINGS_SET })}
        onClientIdChange={noop}
        onSignIn={noop}
        onSignInAgain={noop}
        onOpenAgain={noop}
        onBackOut={noop}
        onWatch={noop}
        onClear={noop}
        onSkipStatuses={noop}
        onStartReaction={noop}
        onRunChecksUnasked={noop}
        onDefaultMode={noop}
      />
      <RecordingSitesPanel view={view} onSignIn={onSignIn} />
    </div>,
  )
}

const recordings = (state: string, width: Width = 'page') => (
  <Recordings start={RECORDING_SITES_STATES[state]!} width={width} />
)

export const RECORDING_SITES_SCENES: Scene[] = [
  {
    id: 'recording-sites',
    title: 'Recordings',
    component: 'RecordingSitesPanel (GroupRecordingsSettings)',
    group: 'Settings',
    description:
      'Settings → Group, under Slack: the person’s own sign-in to each site colleagues share recordings on, today Loom. A review fetches a recording through that sign-in, so it is asked for once, here. One row per site: its name, how the sign-in stands (Not checked until the backend has looked, Signed out, Signed in, with when it was last seen), and one button. The button opens the site’s own sign-in page inside the app (see "Sign in inside the app"); no window opens on the machine running the backend. The row reads Signing in… the moment the button is pressed, before the backend answers, and the button is busy only until it does, so a second press in that moment asks for nothing. While the sign-in is open the button reads Show sign-in and brings the same one back, and a line under the row says it closes by itself. When the site shows the person signed in, the sign-in view goes and the row reads Signed in; closed by hand it goes back to what was last seen. A sign-in that did not start, or that was open too long, puts the row back as it was with why under it. The sign-in is the person’s, not the group’s: it reads the same in every group. Once signed in the button turns quiet and reads Sign in again, as Slack’s does, for a sign-in the site has since ended.',
    states: [
      {
        id: 'not-checked',
        title: 'Not checked yet',
        description:
          'A fresh backend has not looked at the site. Press Sign in to Loom to see the row change at once.',
        render: () => recordings('not-checked'),
      },
      {
        id: 'signed-out',
        title: 'Signed out',
        description: 'The site showed its sign-in page when it was last opened.',
        render: () => recordings('signed-out'),
      },
      {
        id: 'starting',
        title: 'Just pressed',
        description: 'Signing in… at once, the button busy until the backend answers.',
        render: () => recordings('starting'),
      },
      {
        id: 'signing-in',
        title: 'Signing in: the sign-in is open',
        description:
          'The button brings the open sign-in back, and the line under the row says it closes by itself.',
        render: () => recordings('signing-in'),
      },
      {
        id: 'signed-in',
        title: 'Signed in',
        description: 'Signing in again is offered quietly beside it.',
        render: () => recordings('signed-in'),
      },
      {
        id: 'signing-in-again',
        title: 'Signing in again',
        description: 'The same open row, from a signed-in one.',
        render: () => recordings('signing-in-again'),
      },
      {
        id: 'sign-in-failed',
        title: 'The sign-in did not start',
        description: 'The row is back as it was, with why; the button is offered again.',
        render: () => recordings('sign-in-failed'),
      },
      {
        id: 'timed-out',
        title: 'The sign-in was open too long',
        description: 'It closed by itself after 15 minutes; the row is back as it was, with why.',
        render: () => recordings('timed-out'),
      },
      {
        id: 'loading',
        title: 'Reading the sign-ins',
        render: () => recordings('loading'),
      },
      {
        id: 'read-failed',
        title: 'The sign-ins could not be read',
        render: () => recordings('read-failed'),
      },
      {
        id: 'in-settings',
        title: 'In the group’s settings',
        description: 'Where it sits: its own block under Slack.',
        render: () => <InSettings />,
      },
      {
        id: 'phone',
        title: 'On a phone',
        description: 'The line saying it closes by itself wraps under the row.',
        render: () => recordings('signing-in', 'phone'),
      },
      {
        id: 'phone-signed-out',
        title: 'Signed out, on a phone',
        description: 'The button moves under the name once the row runs out of room.',
        render: () => recordings('signed-out', 'phone'),
      },
    ],
  },
]
