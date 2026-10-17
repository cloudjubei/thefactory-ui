import { Text, View } from 'react-native'

import {
  PROCESS_ALREADY_LANDED_FEATURE_DONE,
  PROCESS_ALREADY_LANDED_FEATURE_STAYS,
  PROCESS_ALREADY_LANDED_FEATURES_HEAD,
  type ProcessAlreadyLandedOffer,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'
import CommitChip from '../chips/CommitChip'
import DependencyRef from '../stories/DependencyRef'

export type AlreadyMergedOfferProps = {
  projectId: string
  offer: ProcessAlreadyLandedOffer
  busy: boolean
  /** Why the last try was refused. */
  error: string | null
  onSettle: () => void
}

/**
 * "Finish as already merged": where the base has held the run's work since,
 * the features finishing makes done, what finishing does, and the button.
 */
export default function AlreadyMergedOffer({
  projectId,
  offer,
  busy,
  error,
  onSettle,
}: AlreadyMergedOfferProps) {
  const { theme, status } = useNativeTheme()
  return (
    <View
      style={{
        gap: 6,
        padding: nativeSpace[2],
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: status.done.softBorder,
        backgroundColor: status.done.softBg,
      }}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 12.5, fontWeight: '600', color: theme.text.primary }}>
          {offer.text}
        </Text>
        <CommitChip projectId={projectId} sha={offer.sha} />
      </View>
      {offer.features.length > 0 ? (
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 11.5, fontWeight: '500', color: theme.text.secondary }}>
            {PROCESS_ALREADY_LANDED_FEATURES_HEAD}
          </Text>
          {offer.features.map((f) => (
            <View
              key={f.dependency}
              style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}
            >
              <DependencyRef dependency={f.dependency} projectId={projectId} />
              <Text style={{ fontSize: 12, color: theme.text.primary }}>{f.title}</Text>
              <Text style={{ fontSize: 11.5, color: theme.text.muted }}>
                {f.becomesDone
                  ? PROCESS_ALREADY_LANDED_FEATURE_DONE
                  : PROCESS_ALREADY_LANDED_FEATURE_STAYS}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      <Text style={{ fontSize: 11.5, color: theme.text.secondary }}>{offer.detail}</Text>
      {error ? <Text style={{ fontSize: 12, color: status.stuck.softFg }}>{error}</Text> : null}
      <View style={{ flexDirection: 'row' }}>
        <Button size="sm" variant="primary" disabled={busy} onPress={onSettle}>
          {offer.label}
        </Button>
      </View>
    </View>
  )
}
