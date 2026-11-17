import { Text, View } from 'react-native'
import ReportTab from '../../src/native/compound/chat/signoff/ReportTab'
import SupersededFilings from '../../src/native/compound/process/SupersededFilings'
import { useNativeTheme } from '../../src/native/hooks/useNativeTheme'
import {
  SUPERSEDED_FILINGS_CURRENT,
  SUPERSEDED_FILINGS_REPLACED,
} from '../scenes/supersededFilingsFixtures'
import type { NativeView } from './views'

/**
 * A run's evidence on a phone. `?view=superseded-filings&state=collapsed` shows
 * the current feature report and a closed Superseded row. `&state=open` has
 * that row open, each filing still labelled Superseded.
 */
export const SUPERSEDED_FILINGS_VIEWS: NativeView[] = [
  {
    id: 'superseded-filings',
    title: 'Superseded filings shown apart',
    render: (address) => <Evidence open={address.get('state') === 'open'} />,
  },
]

function Evidence({ open }: { open: boolean }) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ width: 390, maxWidth: '100%', gap: 8, padding: 12 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>Evidence</Text>
      <ReportTab reports={SUPERSEDED_FILINGS_CURRENT} />
      <SupersededFilings filings={SUPERSEDED_FILINGS_REPLACED} defaultOpen={open} />
    </View>
  )
}
