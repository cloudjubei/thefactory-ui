import type { ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import { CliConfigsProvider } from '../../src/headless/contexts/CliConfigsContext'
import type { StartCliAuthLoginData } from '../../src/headless/api/generated/types.gen'
import type { CredentialCapture } from '../../src/headless/utils/credentialCaptureTypes'
import CliAddCredentialForm from '../../src/native/compound/settings/CliAddCredentialForm'
import CliConfigForm from '../../src/native/compound/settings/CliConfigForm'
import CredentialCaptureCard from '../../src/native/compound/chat/CredentialCaptureCard'
import SignInSessionScreen from '../../src/native/compound/signIn/SignInSessionScreen'
import { useNativeTheme } from '../../src/native/hooks/useNativeTheme'
import { EndsLater } from '../scenes/cliSignInEndsLater'
import { cliSignInRoutes, type CliSignInEnding } from '../scenes/cliSignInFixtures'
import { Acted, OnFixtures, type SceneStep } from '../scenes/onFixtures'
import type { NativeView } from './views'

const noop = () => {}
const never = () => new Promise<void>(() => {})

const CARD: CredentialCapture = {
  id: 'cap-cli',
  purpose: 'Run the review with your Codex login',
  provider: 'cli-login',
  preset: 'codex',
  replacesId: 'codex-home',
  status: 'requested',
  requestedAt: '2026-11-27T09:00:00.000Z',
}

type Place = {
  request: StartCliAuthLoginData['body']
  press: string
  render: () => ReactNode
}

const PLACES: Record<string, Place> = {
  add: {
    request: { cli: 'claude-code', label: 'Claude Code' },
    press: 'Authorize',
    render: () => <CliAddCredentialForm onClose={noop} />,
  },
  again: {
    request: { cli: 'claude-code', label: 'Claude Code (work)', credentialId: 'claude-work' },
    press: 'Re-authenticate',
    render: () => <CliConfigForm />,
  },
  card: {
    request: {
      cli: 'codex',
      label: 'Codex (home)',
      credentialId: 'codex-home',
      captureId: 'cap-cli',
    },
    press: 'Sign in',
    render: () => <CredentialCaptureCard capture={CARD} onSubmit={never} onCancel={never} />,
  },
}

const ENDINGS: Record<string, CliSignInEnding> = {
  open: 'open',
  failed: 'failed',
  'timed-out': 'timed-out',
  refused: 'refused',
}

function Phone({ children }: { children: ReactNode }) {
  const { theme } = useNativeTheme()
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.surface.base }}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      <View style={{ width: 390, maxWidth: '100%', padding: 12, gap: 16 }}>{children}</View>
    </ScrollView>
  )
}

/**
 * A CLI agent's sign-in on a phone, on made-up logins: `?state=add|again|card`
 * for where it starts, with `-open`, `-failed`, `-timed-out` or `-refused` for
 * the press made and how it went. The app's sign-in screen shows under the
 * place that started it, where the app would push it.
 */
function CliSignIn({ address }: { address: URLSearchParams }) {
  const [where = 'add', how] = (address.get('state') ?? 'add').split(/-(.+)/)
  const place = PLACES[where] ?? PLACES.add!
  const ending = how ? (ENDINGS[how] ?? 'open') : 'open'
  const steps: SceneStep[] = how ? [{ press: place.press }] : []
  return (
    <OnFixtures key={address.get('state') ?? 'add'} routes={cliSignInRoutes(ending)}>
      <CliConfigsProvider>
        <EndsLater ending={how ? ending : 'open'} request={place.request}>
          <Phone>
            <Acted steps={steps}>{place.render()}</Acted>
            <View style={{ height: 420 }}>
              <SignInSessionScreen onClosed={noop} />
            </View>
          </Phone>
        </EndsLater>
      </CliConfigsProvider>
    </OnFixtures>
  )
}

export const CLI_SIGN_IN_VIEWS: NativeView[] = [
  {
    id: 'cli-sign-in',
    title: 'Sign a CLI agent in',
    render: (address) => <CliSignIn address={address} />,
  },
]
