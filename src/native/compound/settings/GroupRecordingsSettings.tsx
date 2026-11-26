import { Text, View } from 'react-native'
import {
  RECORDING_SITES_TEXT as TEXT,
  useRecordingSites,
  type RecordingSiteRowView,
  type RecordingSitesView,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import ToneBadge from '../chips/ToneBadge'

export type RecordingSitesPanelProps = {
  view: RecordingSitesView
  /** Open a site's sign-in window on the backend's machine. */
  onSignIn: (siteId: string) => void
}

/**
 * Native peer of [web's `RecordingSitesPanel`](../../../web/compound/settings/GroupRecordingsSettings.tsx):
 * a row per recording site with how the person's sign-in stands and the button
 * that opens its sign-in window on the backend's machine.
 */
export function RecordingSitesPanel({ view, onSignIn }: RecordingSitesPanelProps) {
  const { theme } = useNativeTheme()
  const muted = { fontSize: 13, color: theme.text.secondary }
  return (
    <View accessibilityLabel={TEXT.heading} style={{ gap: nativeSpace[3] }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text.primary }}>
          {TEXT.heading}
        </Text>
        <Text style={muted}>{TEXT.intro}</Text>
      </View>
      {view.readError ? <Alert>{view.readError}</Alert> : null}
      {view.loading ? <Text style={muted}>{TEXT.loading}</Text> : null}
      {!view.loading && !view.readError && view.sites.length === 0 ? (
        <Text style={muted}>{TEXT.none}</Text>
      ) : null}
      {view.sites.length > 0 ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: theme.border.subtle,
            borderRadius: nativeRadii[2],
            overflow: 'hidden',
          }}
        >
          {view.sites.map((site, at) => (
            <SiteRow key={site.id} site={site} divided={at > 0} onSignIn={onSignIn} />
          ))}
        </View>
      ) : null}
    </View>
  )
}

function SiteRow({
  site,
  divided,
  onSignIn,
}: {
  site: RecordingSiteRowView
  divided: boolean
  onSignIn: RecordingSitesPanelProps['onSignIn']
}) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        gap: nativeSpace[2],
        padding: nativeSpace[3],
        ...(divided ? { borderTopWidth: 1, borderTopColor: theme.border.subtle } : {}),
      }}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <Text
          numberOfLines={1}
          style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}
        >
          {site.name}
        </Text>
        <ToneBadge tone={site.tone} label={site.stateLabel} />
        {site.checked ? (
          <Text style={{ fontSize: 12, color: theme.text.muted }}>{site.checked}</Text>
        ) : null}
        <View style={{ marginLeft: 'auto' }}>
          <Button
            size="sm"
            variant={site.primary ? 'primary' : 'ghost'}
            accessibilityLabel={site.action}
            loading={site.signingIn}
            onPress={() => onSignIn(site.id)}
          >
            {site.action}
          </Button>
        </View>
      </View>
      {site.hint ? (
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>{site.hint}</Text>
      ) : null}
      {site.error ? <Alert>{site.error}</Alert> : null}
    </View>
  )
}

/** Native peer of web's `GroupRecordingsSettings`: the panel on the person's live sign-ins, in Settings → Group. */
export default function GroupRecordingsSettings() {
  const recordings = useRecordingSites()
  return <RecordingSitesPanel view={recordings.view} onSignIn={recordings.signIn} />
}
