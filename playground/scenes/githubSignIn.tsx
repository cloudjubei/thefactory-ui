import { useEffect, useState, type ReactNode } from 'react'
import type { SignInSessionState } from 'thefactory-tools/types'
import {
  GitCredentialsProvider,
  SIGN_IN_SESSION_TEXT,
  useProjectGithubRepo,
  type UseProjectGithubRepoResult,
} from 'thefactory-ui/headless'
import { GitCredentialsForm, ProjectGithubRepoField } from 'thefactory-ui/web'
import { WelcomeGithubSignIn } from '../../src/web/screens/WelcomeView'
import type { Scene } from '../showcase/types'
import type { FixtureRoutes } from './onFixtures'
import { WithSignInView } from './inAppSignInFixtures'
import { fakeSignInSession, GITHUB_DEVICE_SURFACE } from './inAppSignInSessions'

const noop = () => {}
const kept = async () => undefined
const never = () => new Promise(noop)

const page = (node: ReactNode) => <div className="w-[560px] max-w-full p-4">{node}</div>
const phone = (node: ReactNode) => <div className="w-[390px] max-w-full p-4">{node}</div>

const CREDENTIAL_PAGE = fakeSignInSession(
  'sign-in-github-credential',
  'github',
  'git-credential',
  'Sign in to GitHub',
)
const CREDENTIAL_DEVICE = fakeSignInSession(
  'sign-in-github-device',
  'github',
  'git-credential',
  'Sign in to GitHub',
  GITHUB_DEVICE_SURFACE,
)
const BOOTSTRAP = fakeSignInSession(
  'sign-in-github-bootstrap',
  'github',
  'bootstrap',
  'Sign in to GitHub',
)

const credentialRoutes = (session: SignInSessionState): FixtureRoutes => ({
  '/api/v1/git-credentials': () => [],
  'POST /api/v1/git-credentials/github/sign-in': () => ({ session }),
})

const STARTING_ROUTES: FixtureRoutes = {
  '/api/v1/git-credentials': () => [],
  'POST /api/v1/git-credentials/github/sign-in': never,
}

function CredentialForm({ session }: { session: SignInSessionState }) {
  const [signedIn, setSignedIn] = useState(false)
  if (signedIn)
    return (
      <p className="text-sm">Signed in: the form closed and the list shows the new credential.</p>
    )
  return (
    <WithSignInView routes={credentialRoutes(session)}>
      <GitCredentialsProvider>
        <GitCredentialsForm
          mode={{ kind: 'create', onSubmit: kept }}
          onCancel={() => setSignedIn(true)}
        />
      </GitCredentialsProvider>
    </WithSignInView>
  )
}

function StartingForm() {
  return (
    <WithSignInView routes={STARTING_ROUTES}>
      <GitCredentialsProvider>
        <GitCredentialsForm mode={{ kind: 'create', onSubmit: kept }} onCancel={noop} />
      </GitCredentialsProvider>
    </WithSignInView>
  )
}

function Welcome() {
  const [tokenId, setTokenId] = useState<string | undefined>()
  if (tokenId) return <p className="text-sm">Signed in: next, name the repository.</p>
  return (
    <WithSignInView
      routes={{
        'POST /api/v1/overseer/github/sign-in': () => ({ session: BOOTSTRAP }),
        '/api/v1/overseer/github/sign-ins/{sessionId}': () => ({ tokenId: 'token-1' }),
      }}
    >
      <WelcomeGithubSignIn onBack={noop} onAuthorized={setTokenId} />
    </WithSignInView>
  )
}

const signedInRepos = { signedIn: false }

function LiveRepoField() {
  const github = useProjectGithubRepo({ defaultName: 'car-finder' })
  const { setEnabled } = github
  useEffect(() => setEnabled(true), [setEnabled])
  return <ProjectGithubRepoField github={github} />
}

function RepoConnect() {
  return (
    <WithSignInView
      routes={{
        'POST /api/v1/git-credentials/github/sign-in': () => ({ session: CREDENTIAL_PAGE }),
        '/api/v1/projects/github/check-name': () =>
          signedInRepos.signedIn
            ? { connected: true, login: 'alex', available: true }
            : { connected: false, available: false },
      }}
      onFinished={() => {
        signedInRepos.signedIn = true
      }}
    >
      <LiveRepoField />
    </WithSignInView>
  )
}

const repoField = (over: Partial<UseProjectGithubRepoResult>): UseProjectGithubRepoResult => ({
  connected: false,
  enabled: true,
  setEnabled: noop,
  repoName: 'car-finder',
  setRepoName: noop,
  status: 'unknown',
  connect: noop,
  connecting: false,
  ready: false,
  ...over,
})

export const GITHUB_SIGN_IN_SCENES: Scene[] = [
  {
    id: 'git-credential-sign-in',
    title: 'Git credential: sign in with GitHub',
    component: 'GitCredentialsForm',
    group: 'Settings',
    description:
      'Settings → Git credentials → +. Sign in with GitHub shows GitHub’s own page inside the app, over the form, on web, desktop and mobile alike: never the person’s browser, a popup or a link out. With the backend’s OAuth secret it is GitHub’s authorize page; with the client id alone it is GitHub’s device page with the code to type there. The backend keeps the credential; once it does, the form closes and the list shows it. Ran out or failed: why, on the form. Closed by hand: back to the form, silently. Pasting a token stays as it was.',
    states: [
      {
        id: 'ready',
        title: 'Ready',
        description: 'A label, Sign in with GitHub, and the token below it.',
        render: () => page(<CredentialForm session={CREDENTIAL_PAGE} />),
      },
      {
        id: 'starting',
        title: 'Opening the sign-in',
        description:
          'Press Sign in with GitHub: a backend that never answers here, so the button stays busy as it does at once on the press. Pressing again sends nothing more.',
        render: () => page(<StartingForm />),
      },
      {
        id: 'flow-page',
        title: 'Press, sign in inside the app, back on the form',
        description:
          'Press Sign in with GitHub: GitHub’s page shows inside the app (made up here, so it stays on opening). The showcase bar ends it as the backend would.',
        render: () => page(<CredentialForm session={CREDENTIAL_PAGE} />),
      },
      {
        id: 'flow-device',
        title: 'The device sign-in, inside the app',
        description:
          'A backend with the client id alone: GitHub’s device page inside the app, with the code to type there.',
        render: () => page(<CredentialForm session={CREDENTIAL_DEVICE} />),
      },
      {
        id: 'phone',
        title: 'On a phone',
        description: 'The small-screen width: the mobile app’s native form follows this.',
        render: () => phone(<CredentialForm session={CREDENTIAL_PAGE} />),
      },
    ],
  },
  {
    id: 'welcome-github-sign-in',
    title: 'First run: sign in with GitHub',
    component: 'WelcomeView (WelcomeGithubSignIn)',
    group: 'Settings',
    description:
      'Create a fresh GitHub repository, on the first run and for a new project: GitHub’s own page shows inside the app. Once it finished, the token it left goes on to naming the repository, as before. Ran out or failed: why, above the button. Closed by hand: back to the button.',
    states: [
      {
        id: 'flow',
        title: 'Press, sign in inside the app, on to the repository',
        description: 'The showcase bar ends the sign-in as the backend would.',
        render: () => page(<Welcome />),
      },
      {
        id: 'phone',
        title: 'On a phone',
        render: () => phone(<Welcome />),
      },
    ],
  },
  {
    id: 'project-github-repo-connect',
    title: 'New project: connect GitHub',
    component: 'ProjectGithubRepoField',
    group: 'Project',
    description:
      'Create a GitHub repository, in the new-project wizard, with no account connected yet: Connect GitHub shows GitHub’s own page inside the app, in place of the old popup with a code. Once it finished, the name field and its address show.',
    states: [
      {
        id: 'not-connected',
        title: 'No account connected',
        render: () => page(<ProjectGithubRepoField github={repoField({})} />),
      },
      {
        id: 'connecting',
        title: 'Opening the sign-in',
        render: () => page(<ProjectGithubRepoField github={repoField({ connecting: true })} />),
      },
      {
        id: 'timed-out',
        title: 'The sign-in ran out',
        render: () =>
          page(
            <ProjectGithubRepoField
              github={repoField({ connectError: SIGN_IN_SESSION_TEXT.timedOut })}
            />,
          ),
      },
      {
        id: 'connected',
        title: 'Connected',
        render: () =>
          page(
            <ProjectGithubRepoField
              github={repoField({
                connected: true,
                login: 'alex',
                status: 'available',
                ready: true,
              })}
            />,
          ),
      },
      {
        id: 'flow',
        title: 'Press, sign in inside the app, back on the field',
        description: 'The showcase bar ends the sign-in as the backend would.',
        render: () => page(<RepoConnect />),
      },
      {
        id: 'phone',
        title: 'On a phone',
        render: () => phone(<ProjectGithubRepoField github={repoField({})} />),
      },
    ],
  },
]
