import { useState, type ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import { recordingSitesView, type RecordingSitesSnapshot } from 'thefactory-ui/headless'
import { RecordingSitesPanel } from '../../src/native/compound/settings/GroupRecordingsSettings'
import { SlackReviewSettingsPanel } from '../../src/native/compound/settings/GroupSlackSettings'
import { useNativeTheme } from '../../src/native/hooks/useNativeTheme'
import { RECORDING_SITES_STATES, RECORDINGS_NOW } from '../scenes/recordingSitesFixtures'
import { SOURCE_SETTINGS_SET, slackSettings } from '../scenes/slackReviewFixtures'
import type { NativeView } from './views'

const noop = () => {}

function Phone({ children }: { children: ReactNode }) {
  const { theme } = useNativeTheme()
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.surface.base }}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      <View style={{ width: 390, maxWidth: '100%', padding: 12, gap: 24 }}>{children}</View>
    </ScrollView>
  )
}

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

function Recordings({ address }: { address: URLSearchParams }) {
  const state = address.get('state') ?? 'not-checked'
  const inSettings = state === 'in-settings'
  const { view, onSignIn } = usePresses(
    RECORDING_SITES_STATES[inSettings ? 'signed-out' : state] ??
      RECORDING_SITES_STATES['not-checked']!,
  )
  return (
    <Phone>
      {inSettings ? (
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
      ) : null}
      <RecordingSitesPanel view={view} onSignIn={onSignIn} />
    </Phone>
  )
}

/**
 * The person's recording sign-ins on mobile, at `?view=recording-sites&state=…`: not-checked,
 * signed-out, starting, signing-in, signed-in, signing-in-again, sign-in-failed, timed-out, loading,
 * read-failed, in-settings — as the web scene.
 */
export const RECORDING_SITES_VIEWS: readonly NativeView[] = [
  { id: 'recording-sites', title: 'Recordings', render: (a) => <Recordings address={a} /> },
]
