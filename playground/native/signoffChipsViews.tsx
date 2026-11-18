import { useState } from 'react'
import { Text, View } from 'react-native'
import ScreensTab from '../../src/native/compound/chat/signoff/ScreensTab'
import ComparisonOverlay from '../../src/native/compound/chat/signoff/ComparisonOverlay'
import { OnFixtures } from '../scenes/onFixtures'
import {
  measuredScreenPairs,
  buildAwareScreenPairs,
  requestScreenPairImage,
  SCREEN_PAIRS_CAPTURED,
  SCREEN_PAIRS_PROJECT,
  SCREEN_PAIR_ROUTES,
} from '../scenes/screenPairsFixtures'
import FeatureReviewSection from '../../src/native/compound/process/FeatureReviewSection'
import { useNativeTheme } from '../../src/native/hooks/useNativeTheme'
import { signoffChipRows } from '../scenes/signoffChipsFixtures'
import type { NativeView } from './views'

const noop = () => {}

/** The three chip lines under the row, the sentences `buildStorySignoff` gave them. */
function Lines({ current }: { current: boolean }) {
  const { theme } = useNativeTheme()
  const rows = signoffChipRows(current)
  return (
    <View style={{ width: 390, maxWidth: '100%', padding: 16, gap: 8 }}>
      <FeatureReviewSection
        projectId="p"
        kind="embedded"
        title="One"
        facts={{ costLabel: undefined, durationLabel: undefined }}
        agents={[]}
        rows={rows}
        verification={undefined}
        statusLine={{ tone: 'review', label: 'In review' }}
        pairs={[]}
        recordings={[]}
        reports={[]}
        emptyLabel=""
        onOpenPair={noop}
        onRequestImage={noop}
      />
      {rows.map((row) => (
        <Text key={row.id} style={{ fontSize: 13, color: theme.text.secondary }}>
          {row.detail}
        </Text>
      ))}
    </View>
  )
}

/** Same refs as web, with real native strip/overlay; not a device or app wiring proof. */
function MeasuredScreens({
  initialKey,
  builds = false,
}: {
  initialKey?: string
  builds?: boolean
}) {
  const [openKey, setOpenKey] = useState(initialKey)
  const pairs = builds ? buildAwareScreenPairs() : measuredScreenPairs()
  return (
    <OnFixtures routes={SCREEN_PAIR_ROUTES}>
      <View style={{ width: '100%', padding: 16 }}>
        <ScreensTab
          pairs={pairs}
          capturedLabel={SCREEN_PAIRS_CAPTURED}
          onOpen={setOpenKey}
          onRequestImage={requestScreenPairImage}
        />
        <ComparisonOverlay
          pairs={pairs}
          openKey={openKey}
          onClose={() => setOpenKey(undefined)}
          baseSha={undefined}
          headSha={undefined}
          projectId={SCREEN_PAIRS_PROJECT}
          onRequestImage={requestScreenPairImage}
        />
      </View>
    </OnFixtures>
  )
}

/**
 * Sign-off chips on a phone. `?state=replaced-only` is one screenshot, one
 * recording and one report, each superseded by attempt-2 — Screens, Walkthrough
 * and Report are not passed. `?state=one-current` adds one current of each:
 * "1 screenshot captured", "1 recording captured", "A report was written".
 */
export const SIGNOFF_CHIP_VIEWS: NativeView[] = [
  {
    id: 'measured-screen-pairs',
    title: 'Screens with filed pixel comparisons',
    render: (address) => (
      <MeasuredScreens
        builds={address.get('state') === 'builds'}
        initialKey={
          address.get('state') === 'account-open'
            ? 'Account'
            : address.get('state') === 'checkout-open'
              ? 'Checkout'
              : undefined
        }
      />
    ),
  },
  {
    id: 'signoff-chips',
    title: 'Sign-off chips ignore a replaced filing',
    render: (address) => <Lines current={address.get('state') === 'one-current'} />,
  },
]
