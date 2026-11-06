import { useState } from 'react'
import { Text, View } from 'react-native'
import { PROVIDER_OAUTH_COPY } from '../../../headless'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'

export interface ProviderOAuthWaitingProps {
  error: string | null
  finishing: boolean
  onOpenAgain: () => void
  /** Takes the address the browser ended on. It goes no further than the sign-in. */
  onFinish: (address: string) => void
  onStartOver: () => void
}

/** Native peer of the web `ProviderOAuthWaiting`: the person pastes the page the sign-in ended on. */
export default function ProviderOAuthWaiting({
  error,
  finishing,
  onOpenAgain,
  onFinish,
  onStartOver,
}: ProviderOAuthWaitingProps) {
  const { theme } = useNativeTheme()
  const [address, setAddress] = useState('')
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
      <Field label={PROVIDER_OAUTH_COPY.returnLabel}>
        <Input
          value={address}
          onChangeText={setAddress}
          placeholder={PROVIDER_OAUTH_COPY.returnPlaceholder}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </Field>
      <Button variant="secondary" onPress={onOpenAgain}>
        {PROVIDER_OAUTH_COPY.openAgain}
      </Button>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[2] }}>
        <Button variant="ghost" onPress={onStartOver}>
          {PROVIDER_OAUTH_COPY.startOver}
        </Button>
        <Button
          loading={finishing}
          disabled={!address.trim() || finishing}
          onPress={() => onFinish(address)}
        >
          {PROVIDER_OAUTH_COPY.finish}
        </Button>
      </View>
    </View>
  )
}
