import { useState, type ReactNode } from 'react'
import { Text, View } from 'react-native'
import { SIGN_IN_SESSION_TEXT as TEXT, type SignInSessionView } from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import Spinner from '../../primitives/Spinner'
import { useClipboardHost } from '../ClipboardHostContext'

export type SignInSessionPanelProps = {
  view: SignInSessionView
  /** The live page, for a session that shows one: its own, or its prompt's address. */
  page?: ReactNode
  onClose: () => void
  /** Takes the value a prompt asks for. */
  onAnswer: (text: string) => void
}

function Code({ code }: { code: string }) {
  const { theme } = useNativeTheme()
  const { copyText } = useClipboardHost()
  const [copied, setCopied] = useState(false)
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>{TEXT.codeLabel}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
        <Text
          selectable
          accessibilityLabel={TEXT.codeLabel}
          style={{
            flexShrink: 1,
            fontSize: 20,
            fontWeight: '700',
            letterSpacing: 1.5,
            fontFamily: 'Menlo',
            color: theme.text.primary,
            backgroundColor: theme.surface.muted,
            borderWidth: 1,
            borderColor: theme.border.subtle,
            borderRadius: nativeRadii[2],
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          {code}
        </Text>
        {copyText ? (
          <Button
            size="sm"
            variant="secondary"
            onPress={() =>
              void copyText(code).then(
                () => setCopied(true),
                () => setCopied(false),
              )
            }
          >
            {copied ? TEXT.copied : TEXT.copyCode}
          </Button>
        ) : null}
      </View>
    </View>
  )
}

function Fields({ view, onAnswer }: Pick<SignInSessionPanelProps, 'view' | 'onAnswer'>) {
  const { theme } = useNativeTheme()
  const [typed, setTyped] = useState('')
  const waiting = !view.page && !view.input && !view.code
  const submit = () => {
    if (!typed || view.answering) return
    onAnswer(typed)
    setTyped('')
  }
  return (
    <View style={{ gap: nativeSpace[3] }}>
      {view.message ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
          {waiting ? <Spinner size={16} color={theme.text.muted} /> : null}
          <Text style={{ flex: 1, fontSize: 14, color: theme.text.primary }}>{view.message}</Text>
        </View>
      ) : null}
      {view.code ? <Code code={view.code} /> : null}
      {view.input ? (
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>{view.input.label}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Input
                accessibilityLabel={view.input.label}
                secureTextEntry={!!view.input.secret}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="send"
                value={typed}
                onChangeText={setTyped}
                onSubmitEditing={submit}
              />
            </View>
            <Button
              loading={!!view.answering}
              disabled={!typed || !!view.answering}
              onPress={submit}
            >
              {TEXT.send}
            </Button>
          </View>
        </View>
      ) : null}
      {view.error ? <Alert>{view.error}</Alert> : null}
    </View>
  )
}

/**
 * Native peer of [web's `SignInSessionPanel`](../../../web/compound/signIn/SignInSessionPanel.tsx):
 * a sign-in to an outside service shown inside the app, as a screen of its
 * own — what is being signed in to, that it closes by itself, a way to close
 * it by hand, and the session's live page, or its prompt above the live page
 * of its address. Nothing opens outside the app.
 */
export default function SignInSessionPanel({
  view,
  page,
  onClose,
  onAnswer,
}: SignInSessionPanelProps) {
  const { theme } = useNativeTheme()
  return (
    <View
      accessibilityLabel={view.title}
      style={{ flex: 1, minHeight: 0, backgroundColor: theme.surface.base }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: nativeSpace[3],
          paddingHorizontal: nativeSpace[3],
          paddingVertical: nativeSpace[2],
          borderBottomWidth: 1,
          borderBottomColor: theme.border.subtle,
          backgroundColor: theme.surface.raised,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{ fontSize: 14, fontWeight: '700', color: theme.text.primary }}
          >
            {view.title}
          </Text>
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>{view.hint}</Text>
        </View>
        <Button size="sm" variant="secondary" onPress={onClose}>
          {TEXT.close}
        </Button>
      </View>
      {view.surface === 'browser' ? (
        <View style={{ flex: 1, minHeight: 0 }}>{page}</View>
      ) : view.page ? (
        <View style={{ flex: 1, minHeight: 0 }}>
          <View
            style={{
              padding: nativeSpace[3],
              borderBottomWidth: 1,
              borderBottomColor: theme.border.subtle,
            }}
          >
            <Fields view={view} onAnswer={onAnswer} />
          </View>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 11.5,
              fontFamily: 'Menlo',
              color: theme.text.muted,
              backgroundColor: theme.surface.muted,
              paddingHorizontal: nativeSpace[3],
              paddingVertical: 4,
            }}
          >
            {view.address}
          </Text>
          <View style={{ flex: 1, minHeight: 0 }}>{page}</View>
        </View>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', padding: nativeSpace[4] }}>
          <Fields view={view} onAnswer={onAnswer} />
        </View>
      )}
    </View>
  )
}
