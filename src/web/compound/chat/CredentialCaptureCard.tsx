import { useState } from 'react'
import type { FormEvent } from 'react'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { SecretInput } from '../SecretInput'
import { IconChevron, IconKey } from '../../icons'
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
  CAPTURE_PURPOSE_LABEL,
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

export type CredentialCaptureCardProps = {
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
 * The agent's credential request, rendered as the tool call it is: the same
 * container, border and header density as `ToolCallCard`, with the form as the
 * expandable section a tool card would put its arguments in. It replaces the
 * row for the call that opened it rather than sitting beside it, so one request
 * reads as one event.
 *
 * The secret goes from the input straight to the credentials API — never into
 * chat state, an error message, or the agent's transcript, which only ever
 * learns that the capture resolved and which credential it produced.
 */
export default function CredentialCaptureCard({
  capture,
  onSubmit,
  onCancel,
  disabled,
}: CredentialCaptureCardProps) {
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

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (locked || !canSubmit) return
    void run(async () => {
      await onSubmit(captureSubmitBody(values))
      setValues(emptyCaptureForm())
      setTouched([])
    }, CAPTURE_SUBMIT_ERROR)
  }

  return (
    <div className="block w-full rounded-md border text-sm text-(--text-primary) bg-amber-500/10 border-amber-500/60">
      <div className="flex items-center gap-2 px-3 py-2 min-w-0">
        <IconKey className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span className="font-semibold shrink-0">{CREDENTIAL_CAPTURE_TOOL_NAME}</span>
        <code
          className="font-mono text-[11px] text-(--text-secondary) bg-(--surface-base) border border-(--border-subtle) rounded px-1.5 py-0.5 truncate min-w-0 flex-1"
          title={`${CAPTURE_PURPOSE_LABEL}: ${capture.purpose}`}
        >
          {capture.purpose}
        </code>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-500/15 rounded-full px-1.5 py-0.5 shrink-0">
          {status.label}
        </span>
        {open ? (
          <button
            type="button"
            className="p-1 rounded hover:bg-(--surface-raised) shrink-0"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={CAPTURE_CARD_TITLE}
          >
            <IconChevron
              className="w-4 h-4 transition-transform"
              style={{ transform: `rotate(${expanded ? 90 : 0}deg)` }}
            />
          </button>
        ) : null}
      </div>

      {showForm ? (
        <form
          onSubmit={submit}
          className="border-t border-amber-500/40 px-3 py-2 flex flex-col gap-2"
        >
          <p className="text-[11px] text-(--text-secondary) wrap-break-word">
            {CAPTURE_CARD_PRIVACY_NOTE}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {captureFields().map((field) => (
              <div key={field.name} className={field.type === 'secret' ? 'sm:col-span-2' : ''}>
                <Field label={field.label} hint={errorFor(field.name)}>
                  {field.type === 'secret' ? (
                    <SecretInput
                      size="sm"
                      value={values[field.name]}
                      onChange={(e) => set(field.name, e.target.value)}
                      onBlur={() => markTouched(field.name)}
                      placeholder={field.placeholder}
                      autoComplete="off"
                      spellCheck={false}
                      disabled={locked}
                      invalid={Boolean(errorFor(field.name))}
                    />
                  ) : (
                    <Input
                      size="sm"
                      type={field.type === 'email' ? 'email' : 'text'}
                      value={values[field.name]}
                      onChange={(e) => set(field.name, e.target.value)}
                      onBlur={() => markTouched(field.name)}
                      placeholder={field.placeholder}
                      autoComplete="off"
                      disabled={locked}
                      invalid={Boolean(errorFor(field.name))}
                    />
                  )}
                </Field>
              </div>
            ))}
          </div>

          {error ? <Alert>{error}</Alert> : null}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={locked}
              onClick={() => void run(onCancel, CAPTURE_CANCEL_ERROR)}
            >
              {CAPTURE_CANCEL_LABEL}
            </Button>
            <Button type="submit" size="sm" loading={busy} disabled={locked || !canSubmit}>
              {CAPTURE_SUBMIT_LABEL}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  )
}
