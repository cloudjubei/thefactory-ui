import { useState } from 'react'
import { View } from 'react-native'
import { recordingSitesView } from 'thefactory-ui/headless'
import { RecordingSitesPanel } from '../../src/native/compound/settings/GroupRecordingsSettings'
import { SignInSessionPage, SignInSessionPanel } from '../../src/native/compound/signIn'
import { useNativeTheme } from '../../src/native/hooks/useNativeTheme'
import { RECORDINGS_NOW, recordingSites } from '../scenes/recordingSitesFixtures'
import {
  CLIPS_VIEW,
  SIGN_IN_PROMPTS,
  useSignInPageScene,
  type SignInPageStep,
} from '../scenes/signInSessionFixtures'
import type { NativeView } from './views'

const noop = () => {}

const PAGE_STEPS: Record<string, SignInPageStep> = {
  page: 'live',
  'page-opening': 'opening',
  'page-reconnecting': 'lost',
}

function LivePage({ step }: { step: SignInPageStep }) {
  const { state, store } = useSignInPageScene('phone', step)
  return <SignInSessionPage state={state} store={store} />
}

function Flow() {
  const [stage, setStage] = useState<'signed-out' | 'open' | 'closed'>('signed-out')
  const view = recordingSitesView(
    recordingSites({
      id: 'clips',
      name: 'Clips',
      state: 'signed-out',
      checkedAt: '2026-11-26T11:57:00.000Z',
      signingIn: stage !== 'signed-out',
    }),
    RECORDINGS_NOW,
  )
  if (stage === 'open')
    return (
      <SignInSessionPanel
        view={CLIPS_VIEW}
        page={<LivePage step="live" />}
        onClose={() => setStage('closed')}
        onAnswer={noop}
      />
    )
  return (
    <View style={{ padding: 12 }}>
      <RecordingSitesPanel view={view} onSignIn={() => setStage('open')} />
    </View>
  )
}

function SignIn({ address }: { address: URLSearchParams }) {
  const { theme } = useNativeTheme()
  const state = address.get('state') ?? 'page'
  const prompt = SIGN_IN_PROMPTS[state.replace(/^prompt-/, '')]
  return (
    <View
      style={{
        width: 390,
        height: 780,
        maxWidth: '100%',
        overflow: 'hidden',
        backgroundColor: theme.surface.base,
      }}
    >
      {state === 'flow' ? (
        <Flow />
      ) : prompt ? (
        <SignInSessionPanel
          view={prompt}
          page={prompt.page ? <LivePage step="live" /> : undefined}
          onClose={noop}
          onAnswer={noop}
        />
      ) : (
        <SignInSessionPanel
          view={CLIPS_VIEW}
          page={<LivePage step={PAGE_STEPS[state] ?? 'live'} />}
          onClose={noop}
          onAnswer={noop}
        />
      )}
    </View>
  )
}

/**
 * A sign-in inside the app on mobile, at `?view=sign-in-session&state=…`: page, page-opening,
 * page-reconnecting, prompt-starting, prompt-page-and-code, prompt-answering, prompt-refused,
 * prompt-device-code, prompt-page-only, prompt-finishing, flow — as the web scene. It is a screen of its own, and the line under the
 * page types into the field the person tapped.
 */
export const SIGN_IN_SESSION_VIEWS: readonly NativeView[] = [
  {
    id: 'sign-in-session',
    title: 'Sign in inside the app',
    render: (a) => <SignIn address={a} />,
  },
]
