import { Text, View } from 'react-native'
import type { ProcessRetryDefinitionChoice, ProcessRetryPick } from 'thefactory-ui/headless'
import RetryChoiceOptions from '../../src/native/compound/process/RetryChoiceOptions'
import { useNativeTheme } from '../../src/native/hooks/useNativeTheme'
import { RETRY_DEFINITIONS_NEWER, RETRY_DEFINITIONS_SAME } from '../scenes/retryDefinitionsFixtures'
import type { NativeView } from './views'

const noop = () => {}

const PICKS: Record<string, ProcessRetryDefinitionChoice | undefined> = {
  'this-run': undefined,
  newer: 'frozen',
  current: 'current',
}

/**
 * The retry choice on a stopped step, on a phone. `?state=this-run` names
 * Reviewer version 4 and Feature version 2. `?state=newer` shows those beside
 * the current Reviewer version 7, with this run’s versions selected.
 * `?state=current` has the current versions selected, which is what Try again runs.
 */
export const RETRY_DEFINITIONS_VIEWS: NativeView[] = [
  {
    id: 'retry-definitions',
    title: 'A retry names the version it runs',
    render: (address) => {
      const state = address.get('state') ?? 'this-run'
      const picked = PICKS[state]
      const offer = state === 'this-run' ? RETRY_DEFINITIONS_SAME : RETRY_DEFINITIONS_NEWER
      const pick: ProcessRetryPick = picked ? { definitions: picked } : {}
      return <Card pick={pick} offer={offer} />
    },
  },
]

function Card({ offer, pick }: { offer: typeof RETRY_DEFINITIONS_SAME; pick: ProcessRetryPick }) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ width: 390, maxWidth: '100%', padding: 12 }}>
      <View
        style={{
          gap: 8,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: theme.border.default,
          backgroundColor: theme.surface.raised,
          padding: 12,
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text.primary }}>
          Try again
        </Text>
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>Run this step again.</Text>
        <RetryChoiceOptions definitions={offer} pick={pick} onPick={noop} />
      </View>
    </View>
  )
}
