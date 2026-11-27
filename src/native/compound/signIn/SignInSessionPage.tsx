import { useState } from 'react'
import { Text, View } from 'react-native'
import {
  REMOTE_BROWSER_TEXT,
  SIGN_IN_SESSION_TEXT as TEXT,
  type RemoteBrowserState,
  type RemoteBrowserStore,
} from '../../../headless'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import Spinner from '../../primitives/Spinner'
import { Switch } from '../../primitives/Switch'
import RemoteBrowserView from '../remoteBrowser/RemoteBrowserView'

export type SignInSessionPageProps = {
  state: RemoteBrowserState
  store: RemoteBrowserStore
}

const KEYS: readonly { key: string; label: string }[] = [
  { key: 'Tab', label: TEXT.tab },
  { key: 'Enter', label: TEXT.enter },
  { key: 'Backspace', label: TEXT.backspace },
]

/**
 * Native peer of [web's `SignInSessionPage`](../../../web/compound/signIn/SignInSessionPage.tsx):
 * a sign-in session's page, live, with no bar of its own. A phone has no keys
 * to press on a picture of a page, so a line under it types into whatever
 * field the person tapped: the text goes to the page when sent and is kept
 * nowhere, and it can be hidden as it is typed.
 */
export default function SignInSessionPage({ state, store }: SignInSessionPageProps) {
  const { theme } = useNativeTheme()
  const [typed, setTyped] = useState('')
  const [hidden, setHidden] = useState(false)
  const live = state.status === 'live'

  const over = state.status === 'ended'
  if (over && state.error)
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          padding: nativeSpace[4],
          backgroundColor: theme.surface.muted,
        }}
      >
        <Alert>{state.error}</Alert>
      </View>
    )
  if (!state.shownId || over)
    return (
      <View
        accessibilityRole="progressbar"
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: nativeSpace[2],
          padding: nativeSpace[4],
          backgroundColor: theme.surface.muted,
        }}
      >
        <Spinner size={16} color={theme.text.muted} />
        <Text style={{ fontSize: 14, color: theme.text.secondary }}>
          {over ? TEXT.finishing : TEXT.opening}
        </Text>
      </View>
    )

  const type = () => {
    if (!typed || !live) return
    void store.send({ kind: 'text', text: typed })
    setTyped('')
  }

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <RemoteBrowserView state={state} store={store} toolbar={false} />
      <View
        style={{
          gap: nativeSpace[2],
          paddingHorizontal: nativeSpace[2],
          paddingVertical: nativeSpace[2],
          borderTopWidth: 1,
          borderTopColor: theme.border.subtle,
          backgroundColor: theme.surface.raised,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Input
              size="sm"
              accessibilityLabel={REMOTE_BROWSER_TEXT.typeOnPage}
              placeholder={REMOTE_BROWSER_TEXT.typeOnPage}
              value={typed}
              disabled={!live}
              secureTextEntry={hidden}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              returnKeyType="send"
              submitBehavior="submit"
              onChangeText={setTyped}
              onSubmitEditing={type}
            />
          </View>
          <Button size="sm" disabled={!typed || !live} onPress={type}>
            {TEXT.type}
          </Button>
        </View>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: nativeSpace[2],
          }}
        >
          {KEYS.map(({ key, label }) => (
            <Button
              key={key}
              size="sm"
              variant="secondary"
              disabled={!live}
              onPress={() => void store.send({ kind: 'key', key })}
            >
              {label}
            </Button>
          ))}
          <View style={{ flex: 1 }} />
          <Switch checked={hidden} onCheckedChange={setHidden} label={TEXT.typeHide} />
        </View>
      </View>
    </View>
  )
}
