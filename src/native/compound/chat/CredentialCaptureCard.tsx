import { useEffect, useState } from 'react'
import { Linking, Pressable, Text, View } from 'react-native'

import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { SecretInput } from '../../primitives/SecretInput'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/Select'
import { IconChevronDown, IconChevronRight, IconKey } from '../../icons'
import { useCliConfigs } from '../../../headless/contexts/CliConfigsContext'
import { useCliSignIn } from '../../../headless/hooks/useCliSignIn'
import { CLI_CLIENT_OPENS_LOGIN_URL } from '../../../headless/utils/cliRunner'
import {
  captureCardTitle,
  captureFields,
  cliSignInRequest,
  captureFormErrors,
  captureStatusDisplay,
  captureSubmitBody,
  captureToolName,
  emptyCaptureForm,
  isAwaitingUser,
  isCaptureFormValid,
  isCliSignInCapture,
} from '../../../headless/utils/credentialCaptures'
import {
  CAPTURE_CANCEL_ERROR,
  CAPTURE_CANCEL_LABEL,
  CAPTURE_CARD_PRIVACY_NOTE,
  CAPTURE_SUBMIT_ERROR,
  CAPTURE_SUBMIT_LABEL,
  CLI_SIGN_IN_AUTHORIZE_HINT,
  CLI_SIGN_IN_CODE_LABEL,
  CLI_SIGN_IN_CODE_PLACEHOLDER,
  CLI_SIGN_IN_CODE_SUBMIT,
  CLI_SIGN_IN_OPEN_LINK,
  CLI_SIGN_IN_PRIVACY_NOTE,
  CLI_SIGN_IN_START_LABEL,
  CLI_SIGN_IN_STARTING,
} from '../../../headless/utils/credentialCaptureConstants'
import type {
  CredentialCapture,
  CredentialCaptureFieldName,
  CredentialCaptureFields,
  CredentialCaptureFormValues,
} from '../../../headless/utils/credentialCaptureTypes'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export interface CredentialCaptureCardProps {
  /** The capture record — the secret-free handshake, never the credentials. */
  capture: CredentialCapture
  /** Posts the typed fields straight to the credentials API. */
  onSubmit: (fields: CredentialCaptureFields) => Promise<void>
  /** Resolves the capture as cancelled — "Not now". */
  onCancel: () => Promise<void>
  /** Blocks the form while the host is busy. */
  disabled?: boolean
}

/**
 * Native peer of
 * [web's `CredentialCaptureCard`](../../../web/compound/chat/CredentialCaptureCard.tsx).
 * The agent's credential request in the tool card's own vocabulary — same
 * container, same header row, the form as the section a tool card would put its
 * arguments in. What the user types goes straight to the credentials API and
 * never into the chat. A CLI sign-in card runs the sign-in here instead.
 */
export default function CredentialCaptureCard({
  capture,
  onSubmit,
  onCancel,
  disabled,
}: CredentialCaptureCardProps) {
  const { theme, status: statusTokens } = useNativeTheme()
  const [values, setValues] = useState<CredentialCaptureFormValues>(() => emptyCaptureForm(capture))
  const [touched, setTouched] = useState<CredentialCaptureFieldName[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // The agent is parked on this form, so it opens showing what it needs; the
  // chevron is for getting it out of the way, not for finding it.
  const [expanded, setExpanded] = useState(true)

  const status = captureStatusDisplay(capture)
  const open = isAwaitingUser(capture)
  const errors = captureFormErrors(capture, values)
  const locked = busy || disabled === true
  const canSubmit = isCaptureFormValid(capture, values)
  const showForm = open && expanded
  const accent = statusTokens.working.bg

  const signInCard = isCliSignInCapture(capture)
  const { caches } = useCliConfigs()
  const signIn = useCliSignIn()
  const [code, setCode] = useState('')
  const storedName = caches.find((c) => c.id === capture.replacesId)?.name
  const signInRequest = cliSignInRequest(capture, values, storedName)
  // A container sign-in cannot open the browser itself: open its link once.
  const [openedFor, setOpenedFor] = useState<string | null>(null)
  useEffect(() => {
    if (!signIn.url || !signIn.loginId || openedFor === signIn.loginId) return
    if (!CLI_CLIENT_OPENS_LOGIN_URL.has(signInRequest.cli)) return
    setOpenedFor(signIn.loginId)
    void Linking.openURL(signIn.url)
  }, [signIn.url, signIn.loginId, openedFor, signInRequest.cli])

  const errorFor = (name: CredentialCaptureFieldName) =>
    touched.includes(name) ? errors[name] : undefined
  const set = (name: CredentialCaptureFieldName, value: string) =>
    setValues((prev) => ({ ...prev, [name]: value }))
  const markTouched = (name: CredentialCaptureFieldName) =>
    setTouched((prev) => (prev.includes(name) ? prev : [...prev, name]))

  const run = async (action: () => Promise<void>, fallback: string) => {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback)
      setBusy(false)
    }
  }

  const submit = () => {
    if (locked || !canSubmit) return
    if (signInCard) {
      if (!signIn.loginId && !signIn.starting) void signIn.start(signInRequest)
      return
    }
    void run(async () => {
      await onSubmit(captureSubmitBody(capture, values))
      setValues(emptyCaptureForm(capture))
      setTouched([])
    }, CAPTURE_SUBMIT_ERROR)
  }

  const PAD = nativeSpace[4]

  return (
    <View
      style={{
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: accent,
        backgroundColor: theme.surface.overlay,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: nativeSpace[2],
          paddingHorizontal: PAD,
          paddingVertical: PAD,
        }}
      >
        <IconKey size={14} color={accent} />
        <Text
          style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}
          numberOfLines={1}
        >
          {captureToolName(capture)}
        </Text>
        <Text style={{ flex: 1, fontSize: 11, color: theme.text.secondary }} numberOfLines={1}>
          {capture.purpose}
        </Text>
        <Text style={{ fontSize: 11, fontWeight: '500', color: accent }} numberOfLines={1}>
          {status.label}
        </Text>
        {open ? (
          <Pressable
            onPress={() => setExpanded((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={captureCardTitle(capture)}
            hitSlop={8}
            style={{ padding: 2 }}
          >
            {expanded ? (
              <IconChevronDown size={14} color={theme.text.secondary} />
            ) : (
              <IconChevronRight size={14} color={theme.text.secondary} />
            )}
          </Pressable>
        ) : null}
      </View>

      {showForm ? (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: accent,
            paddingHorizontal: PAD,
            paddingVertical: PAD,
            gap: nativeSpace[2],
          }}
        >
          <Text style={{ fontSize: 11, color: theme.text.secondary }}>
            {signInCard ? CLI_SIGN_IN_PRIVACY_NOTE : CAPTURE_CARD_PRIVACY_NOTE}
          </Text>

          {captureFields(capture, values).map((field) => (
            <Field key={field.name} label={field.label} hint={errorFor(field.name)}>
              {field.type === 'select' ? (
                <Select value={values[field.name]} onValueChange={(v) => set(field.name, v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={field.placeholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {(field.options ?? []).map((option) => (
                      <SelectItem key={option.value || 'none'} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === 'secret' ? (
                <SecretInput
                  value={values[field.name]}
                  onChangeText={(text) => set(field.name, text)}
                  onBlur={() => markTouched(field.name)}
                  placeholder={field.placeholder}
                  accessibilityLabel={field.label}
                  disabled={locked}
                  invalid={Boolean(errorFor(field.name))}
                />
              ) : (
                <Input
                  value={values[field.name]}
                  onChangeText={(text) => set(field.name, text)}
                  onBlur={() => markTouched(field.name)}
                  placeholder={field.placeholder}
                  accessibilityLabel={field.label}
                  keyboardType={field.type === 'email' ? 'email-address' : 'default'}
                  autoCapitalize="none"
                  autoCorrect={false}
                  disabled={locked}
                  invalid={Boolean(errorFor(field.name))}
                />
              )}
            </Field>
          ))}

          {signIn.loginId ? (
            <View
              style={{
                gap: nativeSpace[2],
                padding: nativeSpace[2],
                borderRadius: nativeRadii[2],
                borderWidth: 1,
                borderColor: theme.border.subtle,
              }}
            >
              {signIn.url ? (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() => void Linking.openURL(signIn.url ?? '')}
                  >
                    {CLI_SIGN_IN_OPEN_LINK}
                  </Button>
                  <Text style={{ fontSize: 11, color: theme.text.secondary }}>
                    {CLI_SIGN_IN_AUTHORIZE_HINT}
                  </Text>
                </>
              ) : (
                <Text style={{ fontSize: 11, color: theme.text.secondary }}>
                  {CLI_SIGN_IN_STARTING}
                </Text>
              )}
              {signIn.needsCode ? (
                <Field label={CLI_SIGN_IN_CODE_LABEL}>
                  <Input
                    value={code}
                    onChangeText={setCode}
                    placeholder={CLI_SIGN_IN_CODE_PLACEHOLDER}
                    accessibilityLabel={CLI_SIGN_IN_CODE_LABEL}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Button
                    size="sm"
                    onPress={() => void signIn.submitCode(code).then(() => setCode(''))}
                  >
                    {CLI_SIGN_IN_CODE_SUBMIT}
                  </Button>
                </Field>
              ) : null}
            </View>
          ) : null}

          {signIn.error ? <Alert variant="error">{signIn.error}</Alert> : null}
          {error ? <Alert variant="error">{error}</Alert> : null}

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              gap: nativeSpace[2],
              flexWrap: 'wrap',
            }}
          >
            <Button
              size="sm"
              variant="ghost"
              disabled={locked}
              onPress={() =>
                void run(async () => {
                  await signIn.cancel()
                  await onCancel()
                }, CAPTURE_CANCEL_ERROR)
              }
            >
              {CAPTURE_CANCEL_LABEL}
            </Button>
            {signIn.loginId === null ? (
              <Button
                size="sm"
                loading={busy || signIn.starting}
                disabled={locked || !canSubmit}
                onPress={submit}
              >
                {signInCard ? CLI_SIGN_IN_START_LABEL : CAPTURE_SUBMIT_LABEL}
              </Button>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  )
}
