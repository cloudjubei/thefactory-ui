import { Text, View } from 'react-native'
import { SecretInput } from '../../primitives/SecretInput'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { nativeFontSizes, nativeSpace } from '../../../tokens/native'
import { useStoredSecretReveal } from '../../../headless/hooks/useStoredSecretReveal'
import { STORED_SECRET_COPY } from '../../../headless/utils/storedSecretViewConstants'
import type { StoredSecretView } from '../../../headless/utils/storedSecretViewTypes'

/**
 * Native peer of web's `StoredSecretCard`: a stored secret an agent showed the
 * person, which only they can reveal. The value never reaches the agent.
 */
export default function StoredSecretCard({ secret }: { secret: StoredSecretView }) {
  const { theme } = useNativeTheme()
  const { onReveal, missing } = useStoredSecretReveal(secret)
  return (
    <View style={{ gap: nativeSpace[2] }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: nativeSpace[2] }}>
        <Text
          style={{ fontSize: nativeFontSizes.xs, fontWeight: '600', color: theme.text.primary }}
        >
          {secret.label}
        </Text>
        <Text
          style={{ fontSize: nativeFontSizes.xs, color: theme.text.secondary }}
          numberOfLines={1}
        >
          {secret.name}
        </Text>
      </View>
      {secret.purpose ? (
        <Text style={{ fontSize: nativeFontSizes.xs, color: theme.text.secondary }}>
          {secret.purpose}
        </Text>
      ) : null}
      {missing ? (
        <Text
          accessibilityRole="text"
          style={{ fontSize: nativeFontSizes.xs, color: theme.text.secondary }}
        >
          {STORED_SECRET_COPY.missing}
        </Text>
      ) : (
        <SecretInput
          value=""
          readOnly
          accessibilityLabel={`${secret.label} ${secret.name}`}
          placeholder="••••••••"
          onReveal={onReveal}
          revealConfirmTitle={STORED_SECRET_COPY.confirmTitle}
          revealConfirmDescription={STORED_SECRET_COPY.confirmDescription}
        />
      )}
      <Text style={{ fontSize: nativeFontSizes.xxs, color: theme.text.muted }}>
        {STORED_SECRET_COPY.only}
      </Text>
    </View>
  )
}
