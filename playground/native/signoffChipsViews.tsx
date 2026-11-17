import { Text, View } from 'react-native'
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

/**
 * Sign-off chips on a phone. `?state=replaced-only` is one screenshot, one
 * recording and one report, each superseded by attempt-2 — Screens, Walkthrough
 * and Report are not passed. `?state=one-current` adds one current of each:
 * "1 screenshot captured", "1 recording captured", "A report was written".
 */
export const SIGNOFF_CHIP_VIEWS: NativeView[] = [
  {
    id: 'signoff-chips',
    title: 'Sign-off chips ignore a replaced filing',
    render: (address) => <Lines current={address.get('state') === 'one-current'} />,
  },
]
