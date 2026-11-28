import { useState, type ReactNode } from 'react'
import { recordingSitesView, type SignInSessionView } from 'thefactory-ui/headless'
import {
  Button,
  RecordingSitesPanel,
  SignInSessionDialog,
  SignInSessionPage,
  SignInSessionPanel,
} from 'thefactory-ui/web'
import type { Scene } from '../showcase/types'
import { RECORDINGS_NOW, recordingSites } from './recordingSitesFixtures'
import {
  CLIPS_VIEW,
  SIGN_IN_PROMPTS,
  useSignInPageScene,
  type SignInPageStep,
} from './signInSessionFixtures'

const noop = () => {}

type Device = 'desktop' | 'phone'

const SIZE: Record<Device, string> = {
  desktop: 'h-[640px] w-[1000px]',
  phone: 'h-[640px] w-[390px]',
}

const frame = (device: Device, children: ReactNode) => (
  <div
    className={`${SIZE[device]} flex max-w-full flex-col overflow-hidden rounded-lg border border-(--border-subtle)`}
  >
    {children}
  </div>
)

function LivePage({ device, step }: { device: Device; step: SignInPageStep }) {
  const { state, store } = useSignInPageScene(device, step)
  return <SignInSessionPage state={state} store={store} compact={device === 'phone'} />
}

function PageScene({ device, step = 'live' }: { device: Device; step?: SignInPageStep }) {
  return frame(
    device,
    <SignInSessionPanel
      view={CLIPS_VIEW}
      page={<LivePage device={device} step={step} />}
      onClose={noop}
      onAnswer={noop}
    />,
  )
}

function PromptScene({ view, device = 'desktop' }: { view: SignInSessionView; device?: Device }) {
  return frame(
    device,
    <SignInSessionPanel
      view={view}
      page={view.page ? <LivePage device={device} step="live" /> : undefined}
      onClose={noop}
      onAnswer={noop}
    />,
  )
}

const CLIPS = { id: 'clips', name: 'Clips' }
const CHECKED = '2026-11-26T11:57:00.000Z'

type Stage = 'signed-out' | 'starting' | 'open' | 'hidden' | 'signed-in'

function sitesAt(stage: Stage) {
  const signedIn = stage === 'signed-in'
  return recordingSitesView(
    recordingSites(
      {
        ...CLIPS,
        state: signedIn ? 'signed-in' : 'signed-out',
        checkedAt: CHECKED,
        signingIn: stage === 'open' || stage === 'hidden',
      },
      { starting: stage === 'starting' ? ['clips'] : [] },
    ),
    RECORDINGS_NOW,
  )
}

/** The whole way through on made-up data: press, sign in on the page, back on the row. */
function Flow({ start }: { start: Stage }) {
  const [stage, setStage] = useState<Stage>(start)
  return (
    <div className="flex w-[760px] max-w-full flex-col gap-4 p-4">
      <RecordingSitesPanel view={sitesAt(stage)} onSignIn={() => setStage('open')} />
      {stage === 'open' ? (
        <SignInSessionDialog
          view={CLIPS_VIEW}
          page={
            <>
              <LivePage device="desktop" step="live" />
              <div className="flex shrink-0 items-center gap-2 border-t border-(--border-subtle) bg-(--surface-raised) px-3 py-2 text-[12px] text-(--text-muted)">
                Showcase only:
                <Button size="sm" variant="ghost" onClick={() => setStage('signed-in')}>
                  The site shows you signed in
                </Button>
              </div>
            </>
          }
          onClose={() => setStage('hidden')}
          onAnswer={noop}
        />
      ) : null}
    </div>
  )
}

export const SIGN_IN_SESSION_SCENES: Scene[] = [
  {
    id: 'sign-in-session',
    title: 'Sign in inside the app',
    component: 'SignInSessionPanel, SignInSessionPage, SignInSessionDialog (SignInSessionHost)',
    group: 'Settings',
    wide: true,
    description:
      'One way to sign in to an outside service, used wherever the app needs one; a recording site is its first user. Pressing a sign-in button opens the service’s own sign-in inside the app, over whatever the person was on, and the app never opens a browser window on the machine running the backend. It shows one of two things. A live page: the site’s own sign-in page, opened out of sight in the person’s browser profile on the backend and shown here as it paints; clicks, scrolling and typing go to that page, so a password is typed into the site’s own field and is kept nowhere by the app. It has no address bar and no pick or mark tools: a sign-in shows only its own page. Or a prompt, for a sign-in run by something else, such as a command-line tool that names an address and waits: a line saying what to do, the live page of that address beside it (above it on a phone), its address over the page, a code to enter there shown large with Copy for a device sign-in, and a field for the code the service shows, with Send. Nothing ever opens in the person’s own browser. Above either: what is being signed in to, the line "This closes by itself once you’re signed in", and Close. When the service shows the person signed in, the view goes by itself and they are back on the row they pressed, which now reads Signed in. Close ends the sign-in by hand and the row keeps what was last seen. A press beside the dialog or Escape does not close it: both are easy to make while typing a password. Nobody signing in for 15 minutes closes it too, and the row then says so. Pressing the row’s button while its sign-in is open shows the same one again. On a phone it is a screen of its own, pushed over Settings, and a line under the page types into the field the person tapped.',
    states: [
      {
        id: 'page',
        title: 'The site’s own sign-in page, live',
        description:
          'A made-up site stands in for the real one. Click a field and type: it goes to the page.',
        render: () => <PageScene device="desktop" />,
      },
      {
        id: 'page-opening',
        title: 'The page is opening',
        description: 'Shown at once on the press, before the first picture of the page arrives.',
        render: () => <PageScene device="desktop" step="opening" />,
      },
      {
        id: 'page-reconnecting',
        title: 'The connection dropped',
        description: 'The page stays as it was, greyed, and comes back on its own.',
        render: () => <PageScene device="desktop" step="lost" />,
      },
      {
        id: 'prompt-starting',
        title: 'A prompt: starting',
        description: 'A sign-in with no page of its own, before it has said what to do.',
        render: () => <PromptScene view={SIGN_IN_PROMPTS.starting!} />,
      },
      {
        id: 'prompt-page-and-code',
        title: 'A prompt: its page beside it, a code to paste',
        description:
          'The address opens inside the app, in the person’s sign-in profile, with its address above it; the field takes the code the page shows. Nothing opens in their own browser.',
        render: () => <PromptScene view={SIGN_IN_PROMPTS['page-and-code']!} />,
      },
      {
        id: 'prompt-answering',
        title: 'A prompt: the code is on its way',
        render: () => <PromptScene view={SIGN_IN_PROMPTS.answering!} />,
      },
      {
        id: 'prompt-refused',
        title: 'A prompt: the code was not taken',
        description: 'Why, under the field; the field is empty again for another try.',
        render: () => <PromptScene view={SIGN_IN_PROMPTS.refused!} />,
      },
      {
        id: 'prompt-device-code',
        title: 'A prompt: a code to enter on the page',
        description:
          'For a device sign-in: the code shows large with Copy, to paste into the page beside it.',
        render: () => <PromptScene view={SIGN_IN_PROMPTS['device-code']!} />,
      },
      {
        id: 'prompt-page-only',
        title: 'A prompt: only its page',
        description: 'For a service that needs nothing given back.',
        render: () => <PromptScene view={SIGN_IN_PROMPTS['page-only']!} />,
      },
      {
        id: 'prompt-finishing',
        title: 'A prompt: finishing',
        description: 'No page, nothing to give: it waits for the service.',
        render: () => <PromptScene view={SIGN_IN_PROMPTS['code-only']!} />,
      },
      {
        id: 'phone-page',
        title: 'The page, at a phone’s width',
        render: () => <PageScene device="phone" />,
      },
      {
        id: 'phone-prompt',
        title: 'A prompt, at a phone’s width',
        render: () => <PromptScene view={SIGN_IN_PROMPTS['device-code']!} device="phone" />,
      },
      {
        id: 'flow',
        title: 'From the row and back',
        description:
          'Press Sign in to Clips: the sign-in opens over the settings. "The site shows you signed in" stands in for signing in; the view goes and the row reads Signed in. Close instead leaves the row offering Show sign-in in this showcase; in the app closing ends the sign-in.',
        render: () => <Flow start="signed-out" />,
      },
      {
        id: 'over-settings',
        title: 'Open over the settings',
        description: 'The dialog as it sits over the page the person pressed on.',
        overlay: true,
        render: () => <Flow start="open" />,
      },
    ],
  },
]
