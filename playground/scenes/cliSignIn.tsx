import type { ReactNode } from 'react'
import { CliAddCredentialForm, CliConfigForm, SignInSessionHost } from 'thefactory-ui/web'
import { CliConfigsProvider } from '../../src/headless/contexts/CliConfigsContext'
import type { StartCliAuthLoginData } from '../../src/headless/api/generated/types.gen'
import CredentialCaptureCard from '../../src/web/compound/chat/CredentialCaptureCard'
import type { CredentialCapture } from '../../src/headless/utils/credentialCaptureTypes'
import type { Scene } from '../showcase/types'
import { Dock } from './askRows'
import { EndsLater } from './cliSignInEndsLater'
import { cliSignInRoutes, type CliSignInEnding } from './cliSignInFixtures'
import { Acted, OnFixtures, type SceneStep } from './onFixtures'

const never = () => new Promise<void>(() => {})

/** A connected CLI view on made-up logins, its press made for the state, with the app's sign-in view over it. */
function Connected({
  ending = 'open',
  request,
  steps = [],
  children,
}: {
  ending?: CliSignInEnding
  request: StartCliAuthLoginData['body']
  steps?: readonly SceneStep[]
  children: ReactNode
}) {
  return (
    <OnFixtures key={`${ending}-${steps.length}`} routes={cliSignInRoutes(ending)}>
      <CliConfigsProvider>
        <EndsLater ending={steps.length ? ending : 'open'} request={request}>
          <Acted steps={steps}>{children}</Acted>
          <SignInSessionHost />
        </EndsLater>
      </CliConfigsProvider>
    </OnFixtures>
  )
}

const NEW_CLAUDE = { cli: 'claude-code' as const, label: 'Claude Code' }
const AGAIN_CLAUDE = {
  cli: 'claude-code' as const,
  label: 'Claude Code (work)',
  credentialId: 'claude-work',
}
const CARD_CODEX = {
  cli: 'codex' as const,
  label: 'Codex (home)',
  credentialId: 'codex-home',
  captureId: 'cap-cli',
}

const AUTHORIZE: SceneStep[] = [{ press: 'Authorize' }]
const SIGN_IN_AGAIN: SceneStep[] = [{ press: 'Re-authenticate' }]
const CARD_SIGN_IN: SceneStep[] = [{ press: 'Sign in' }]

function AddLogin({ ending, pressed }: { ending?: CliSignInEnding; pressed?: boolean }) {
  return (
    <Connected
      request={NEW_CLAUDE}
      {...(ending ? { ending } : {})}
      {...(pressed ? { steps: AUTHORIZE } : {})}
    >
      <div className="w-[480px] max-w-full rounded-lg border border-(--border-subtle) p-4">
        <CliAddCredentialForm onClose={() => {}} />
      </div>
    </Connected>
  )
}

function Logins({ ending, pressed }: { ending?: CliSignInEnding; pressed?: boolean }) {
  return (
    <Connected
      request={AGAIN_CLAUDE}
      {...(ending ? { ending } : {})}
      {...(pressed ? { steps: SIGN_IN_AGAIN } : {})}
    >
      <div className="w-full max-w-[1000px]">
        <CliConfigForm />
      </div>
    </Connected>
  )
}

const CARD: CredentialCapture = {
  id: 'cap-cli',
  purpose: 'Run the review with your Codex login',
  provider: 'cli-login',
  preset: 'codex',
  replacesId: 'codex-home',
  status: 'requested',
  requestedAt: '2026-11-27T09:00:00.000Z',
}

function Card({ ending, pressed }: { ending?: CliSignInEnding; pressed?: boolean }) {
  return (
    <Connected
      request={CARD_CODEX}
      {...(ending ? { ending } : {})}
      {...(pressed ? { steps: CARD_SIGN_IN } : {})}
    >
      <Dock>
        <CredentialCaptureCard capture={CARD} onSubmit={never} onCancel={never} />
      </Dock>
    </Connected>
  )
}

export const CLI_SIGN_IN_SCENES: Scene[] = [
  {
    id: 'cli-sign-in',
    title: 'Sign a CLI agent in',
    component: 'CliAddCredentialForm, CliConfigForm, CredentialCaptureCard (cli-login)',
    group: 'Settings',
    wide: true,
    description:
      'Claude Code, Cursor Agent and Codex are signed in inside the app, through the same sign-in view as every other sign-in (see "Sign in inside the app"); nothing opens the person’s own browser, and no link or code box is drawn here any more. Three places start it: Authorize in Settings → LLM → CLI agents → Add credential (a new login), Re-authenticate on a stored login (the same login signed in again, so everything using it keeps working), and Sign in on the agent’s sign-in card in a chat. The press is busy at once, and the sign-in view opens with the provider’s page and what it asks for: for Claude Code a Code field (filled by itself once the page shows the code), for Codex a one-time code to enter on the page, for Cursor Agent the page alone. A second press while the first is on its way asks for nothing; pressed again once it is open, the same sign-in shows again. While it is open the place that started it reads Signing in…. Once the login is saved the view goes by itself, the login list reads it again (the add dialog closes, the card turns Signed in). A sign-in that failed or was open too long leaves why where it was pressed; one closed by hand leaves nothing. Fixed made-up data: the states that end do so a moment after the press.',
    states: [
      {
        id: 'add',
        title: 'Add a login',
        description: 'Pick the CLI and a name, then Authorize.',
        render: () => <AddLogin />,
      },
      {
        id: 'add-open',
        title: 'Add a login: signing in',
        description:
          'Authorize pressed: the sign-in view shows Claude Code’s prompt, the form reads Signing in….',
        render: () => <AddLogin pressed />,
      },
      {
        id: 'add-failed',
        title: 'Add a login: the sign-in failed',
        description: 'The view went; the login’s own reason stays above the form.',
        render: () => <AddLogin pressed ending="failed" />,
      },
      {
        id: 'add-timed-out',
        title: 'Add a login: open too long',
        render: () => <AddLogin pressed ending="timed-out" />,
      },
      {
        id: 'add-refused',
        title: 'Add a login: the sign-in did not start',
        description:
          'The backend refused the press; the form is back as it was, with the backend’s reason (the showcase’s stand-in can only refuse as not found).',
        render: () => <AddLogin pressed ending="refused" />,
      },
      {
        id: 'again',
        title: 'Sign a stored login in again',
        description: 'Re-authenticate on each stored login.',
        render: () => <Logins />,
      },
      {
        id: 'again-open',
        title: 'Signing a stored login in again',
        description:
          'Re-authenticate pressed on the first login: the sign-in view shows; the row reads Signing in….',
        render: () => <Logins pressed />,
      },
      {
        id: 'again-failed',
        title: 'Signing in again failed',
        description: 'Why stays under the row it was pressed on.',
        render: () => <Logins pressed ending="failed" />,
      },
      {
        id: 'card',
        title: 'The agent’s sign-in card',
        description: 'A chat run needs Codex signed in again.',
        render: () => <Card />,
      },
      {
        id: 'card-open',
        title: 'The card: signing in',
        description:
          'Sign in pressed: the sign-in view shows Codex’s code; the card reads Signing in….',
        render: () => <Card pressed />,
      },
      {
        id: 'card-failed',
        title: 'The card: the sign-in failed',
        description: 'The card stays open with why, so the person can try again.',
        render: () => <Card pressed ending="failed" />,
      },
    ],
  },
]
