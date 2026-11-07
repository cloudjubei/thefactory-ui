import { Text, View } from 'react-native'
import { PROVIDER_OAUTH_COPY } from '../../../headless'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'

export interface ProviderOAuthWaitingProps {
  error: string | null
  onOpenAgain: () => void
  /** Backs out of the sign-in, whatever became of the browser. */
  onBackOut: () => void
}

/** Native peer of the web `ProviderOAuthWaiting`. */
export default function ProviderOAuthWaiting({
  error,
  onOpenAgain,
  onBackOut,
}: ProviderOAuthWaitingProps) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: nativeSpace[4] }}>
      {error ? <Alert>{error}</Alert> : null}
      <View style={{ gap: nativeSpace[1] }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}>
          {PROVIDER_OAUTH_COPY.waitingTitle}
        </Text>
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>
          {PROVIDER_OAUTH_COPY.waitingBody}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[2] }}>
        <Button variant="ghost" onPress={onBackOut}>
          {PROVIDER_OAUTH_COPY.backOut}
        </Button>
        <Button variant="secondary" onPress={onOpenAgain}>
          {PROVIDER_OAUTH_COPY.openAgain}
        </Button>
      </View>
    </View>
  )
}
