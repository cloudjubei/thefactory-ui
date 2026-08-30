import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { SecretInput } from '../../primitives/SecretInput'
import { IconChevronDown, IconChevronRight, IconKey } from '../../icons'
import {
  captureFields,
  captureFormErrors,
  captureStatusDisplay,
  captureSubmitBody,
  emptyCaptureForm,
  isAwaitingUser,
  isCaptureFormValid,
} from '../../../headless/utils/credentialCaptures'
import {
  CAPTURE_CANCEL_ERROR,
  CAPTURE_CANCEL_LABEL,
  CAPTURE_CARD_PRIVACY_NOTE,
  CAPTURE_CARD_TITLE,
  CAPTURE_SUBMIT_ERROR,
  CAPTURE_SUBMIT_LABEL,
  CREDENTIAL_CAPTURE_TOOL_NAME,
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
 * never into the chat.
 */
export default function CredentialCaptureCard({
  capture,
  onSubmit,
  onCancel,
  disabled,
}: CredentialCaptureCardProps) {
  const { theme, status: statusTokens } = useNativeTheme()
  const [values, setValues] = useState<CredentialCaptureFormValues>(emptyCaptureForm)
  const [touched, setTouched] = useState<CredentialCaptureFieldName[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // The agent is parked on this form, so it opens showing what it needs; the
  // chevron is for getting it out of the way, not for finding it.
  const [expanded, setExpanded] = useState(true)

  const status = captureStatusDisplay(capture)
  const open = isAwaitingUser(capture)
  const errors = captureFormErrors(values)
  const locked = busy || disabled === true
  const canSubmit = isCaptureFormValid(values)
  const showForm = open && expanded
  const accent = statusTokens.working.bg

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
    void run(async () => {
      await onSubmit(captureSubmitBody(values))
      setValues(emptyCaptureForm())
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
          {CREDENTIAL_CAPTURE_TOOL_NAME}
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
            accessibilityLabel={CAPTURE_CARD_TITLE}
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
            {CAPTURE_CARD_PRIVACY_NOTE}
          </Text>

          {captureFields().map((field) => (
            <Field key={field.name} label={field.label} hint={errorFor(field.name)}>
              {field.type === 'secret' ? (
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
              onPress={() => void run(onCancel, CAPTURE_CANCEL_ERROR)}
            >
              {CAPTURE_CANCEL_LABEL}
            </Button>
            <Button size="sm" loading={busy} disabled={locked || !canSubmit} onPress={submit}>
              {CAPTURE_SUBMIT_LABEL}
            </Button>
          </View>
        </View>
      ) : null}
    </View>
  )
}
